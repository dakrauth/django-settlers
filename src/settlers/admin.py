import json
from django.db import models
from django.contrib import admin
from django.forms.widgets import Textarea

from . import models as settlers


class JsonTextarea(Textarea):

    def __init__(self, attrs=None):
        super().__init__(attrs)
        self.attrs['style'] = 'font-family: monospace; width: 95%; height: 40em'

    def format_value(self, value):
        return json.dumps(json.loads(str(value)), indent=4)


@admin.register(settlers.SettlersProfile)
class SettlersProfileAdmin(admin.ModelAdmin):
    list_display = ('name',)


@admin.register(settlers.Settlers)
class SettlersAdmin(admin.ModelAdmin):
    list_display = ('id', 'player_names')
    filter_horizontal = ['player_profiles']
    formfield_overrides = {
        models.TextField: {'widget': JsonTextarea},
    }

    def player_names(self, obj):
        return ', '.join(obj.player_profiles.select_related('user').values_list(
            'user__username',
            flat=True
        ))
