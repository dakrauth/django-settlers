FROM python:3.7-alpine
MAINTAINER David Krauth "dakrauth@gmail.com"

COPY . /app
RUN pip install .
WORKDIR /app/tests

RUN python manage.py loaddemo

EXPOSE 80
CMD ["python", "manage.py", "runserver", "0:80"]

