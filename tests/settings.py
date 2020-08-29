import sys
from pathlib import Path

BASE_DIR = Path(__file__).parent

ALLOWED_HOSTS = []
AUTH_PASSWORD_VALIDATORS = []
DEBUG = True
LANGUAGE_CODE = 'en-us'
LOGIN_URL = '/admin/login/'
ROOT_URLCONF = 'urls'
SECRET_KEY = 'supersecretsettlerskey!!'
STATIC_URL = '/static/'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_L10N = True
USE_TZ = True

DATABASES = {'default': {
    'ENGINE': 'django.db.backends.sqlite3',
    'NAME': ':memory:' if 'pytest' in sys.argv else 'settlers.sqlite3',
}}

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'settlers'
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]
