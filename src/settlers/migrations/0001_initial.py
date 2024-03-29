# Generated by Django 4.2.8 on 2023-12-14 05:45

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django_extensions.db.fields.json


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="SettlersProfile",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("favorite_colors", models.CharField(blank=True, max_length=35)),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="Settlers",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("created", models.DateTimeField(auto_now_add=True)),
                ("updated", models.DateTimeField(auto_now=True)),
                ("game", django_extensions.db.fields.json.JSONField(default=dict)),
                (
                    "player_profiles",
                    models.ManyToManyField(blank=True, to="settlers.settlersprofile"),
                ),
            ],
            options={
                "verbose_name": "Settlers Game",
                "verbose_name_plural": "Settlers Games",
            },
        ),
    ]
