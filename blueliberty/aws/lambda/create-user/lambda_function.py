import json
import boto3
import uuid
import secrets
import string
from botocore.exceptions import ClientError
import os

AWS_REGION = os.environ["AWS_REGION"]
DYNAMODB_TABLE = os.environ.get("DYNAMODB_TABLE", "AllowedUsers")
COGNITO_USER_POOL_ID = os.environ.get("COGNITO_USER_POOL_ID")
S3_BUCKET_NAME = os.environ.get("S3_BUCKET_NAME")

dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
cognito = boto3.client("cognito-idp", region_name=AWS_REGION)
s3 = boto3.client("s3", region_name=AWS_REGION)

def s3_folder_exists(org_id):
    """Check if the S3 folder for this org already exists."""
    res = s3.list_objects_v2(
        Bucket=S3_BUCKET_NAME,
        Prefix=f'clients/{org_id}/',
        MaxKeys=1
    )
    return res.get('KeyCount', 0) > 0

def lambda_handler(event, context):
    try:
        body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']

        email      = body.get('email', '').strip().lower()
        first_name = body.get('firstName', '').strip()
        last_name  = body.get('lastName', '').strip()
        org_name   = body.get('orgName', '').strip()
        role       = body.get('role', '').strip()

        org_ids_raw = body.get('orgIds', None)
        if org_ids_raw:
            org_ids = [o.strip() for o in org_ids_raw if o.strip()]
        else:
            single = body.get('orgId', '').strip()
            org_ids = [single] if single else [str(uuid.uuid4())]

        # ✅ Only require email and org_ids upfront
        if not email or not org_ids:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Email and at least one orgId are required'})
            }

        table = dynamodb.Table(DYNAMODB_TABLE)

        # ── Step 1: Cognito ──────────────────────────────────────────────
        user_already_existed = False
        temp_password = generate_temp_password()

        try:
            cognito.admin_create_user(
                UserPoolId=COGNITO_USER_POOL_ID,
                Username=email,
                UserAttributes=[
                    {'Name': 'email',          'Value': email},
                    {'Name': 'email_verified', 'Value': 'true'},
                    {'Name': 'given_name',     'Value': first_name},
                    {'Name': 'family_name',    'Value': last_name}
                ],
                TemporaryPassword=temp_password,
                MessageAction='DELIVER'
            )
        except ClientError as e:
            if e.response['Error']['Code'] == 'UsernameExistsException':
                user_already_existed = True
            else:
                raise e

        # ✅ Validate full fields only for brand new users
        if not user_already_existed and not all([first_name, last_name, org_name, role]):
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'All fields are required for new users'})
            }

        # ── Step 2: DynamoDB ─────────────────────────────────────────────
        if user_already_existed:
            # ✅ Append org to existing user's set + update orgNames map
            table.update_item(
                Key={'email': email},
                UpdateExpression="ADD orgIds :new_orgs SET orgNames.#oid = :oname",
                ExpressionAttributeNames={"#oid": org_ids[0]},
                ExpressionAttributeValues={
                    ':new_orgs': set(org_ids),
                    ':oname':    org_name,
                }
            )
            temp_password = None

        else:
            # ✅ New user — write full record
            table.put_item(Item={
                'email':     email,
                'firstName': first_name,
                'lastName':  last_name,
                'orgIds':    set(org_ids),
                'orgNames':  {org_ids[0]: org_name},
                'orgName':   org_name,
                'role':      role
            })

        # ── Step 3: S3 folders — only if org is brand new ───────────────
        for org_id in org_ids:
            if not s3_folder_exists(org_id):
                print(f"Creating S3 folders for new org: {org_id}")
                for key in [
                    f'clients/{org_id}/',
                    f'clients/{org_id}/inbound/',
                    f'clients/{org_id}/outbound/'
                ]:
                    s3.put_object(Bucket=S3_BUCKET_NAME, Key=key, Body='')
            else:
                print(f"S3 folders already exist for org: {org_id}, skipping")

        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'User created' if not user_already_existed else 'Campaign added successfully',
                'email':   email,
                'orgIds':  org_ids,
                **({"tempPassword": temp_password} if temp_password else {})
            })
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        return {'statusCode': 500, 'body': json.dumps({'error': 'Internal server error'})}


def generate_temp_password():
    lowercase = string.ascii_lowercase
    uppercase = string.ascii_uppercase
    digits    = string.digits
    special   = "!@#$%^&*"
    password  = [
        secrets.choice(lowercase),
        secrets.choice(uppercase),
        secrets.choice(digits),
        secrets.choice(special)
    ]
    all_chars = lowercase + uppercase + digits + special
    for _ in range(8):
        password.append(secrets.choice(all_chars))
    secrets.SystemRandom().shuffle(password)
    return ''.join(password)