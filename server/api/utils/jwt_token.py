from itsdangerous import URLSafeTimedSerializer
from flask import current_app
from flask_jwt_extended import get_jwt


def generate_verification_token(email):
    serializer = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
    return serializer.dumps(email, salt=current_app.config['SECURITY_PASSWORD_SALT'])


def confirm_verification_token(token, expiration=3600):
    serializer = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
    try:
        email = serializer.loads(
            token,
            salt=current_app.config['SECURITY_PASSWORD_SALT'],
            max_age=expiration
        )
    except Exception as e:
        return e
    return email


def check_permission(pages):
    def decorator(func):
        def wrap():
            page_perm = get_jwt()['ucr']
            same_set = set(page_perm) & set(pages)
            if len(same_set) > 0:
                return func()
            else:
                return 'permission denied'
        return wrap
    return decorator
