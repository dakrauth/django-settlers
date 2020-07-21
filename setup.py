import runpy
from setuptools import setup

VERSION = runpy.run_path('src/settlers/__init__.py')['get_version']()

setup(version=VERSION)
