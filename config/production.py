from .settings import *
import os
import dj_database_url
import urllib.parse

DEBUG = os.getenv("DEBUG") == "True"

ALLOWED_HOSTS = os.getenv(
    "ALLOWED_HOSTS",
    "iniando-arg.onrender.com"
).split(",")

render_host = os.getenv("RENDER_EXTERNAL_HOSTNAME")
if render_host:
    CSRF_TRUSTED_ORIGINS = [f"https://{render_host}"]

STATIC_ROOT = BASE_DIR / "staticfiles"

MIDDLEWARE.insert(
    1,
    'whitenoise.middleware.WhiteNoiseMiddleware'
)

STATICFILES_STORAGE = (
    'whitenoise.storage.CompressedManifestStaticFilesStorage'
)

SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

REDIS_URL = os.getenv("REDIS_URL")

if REDIS_URL:
    url = urllib.parse.urlparse(REDIS_URL)

    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels_redis.core.RedisChannelLayer",
            "CONFIG": {
                "hosts": [(url.hostname, url.port)],
            },
        },
    }


DATABASES = {
    "default": dj_database_url.parse(os.environ["DATABASE_URL"])
}