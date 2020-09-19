import json
import random
from django import forms
from .models import Settlers


class SubmitError(Exception):
    pass


class JSONField(forms.CharField):
    widget = forms.HiddenInput

    def clean(self, value):
        value = super().clean(value)
        return json.loads(value) if value else value


class SettlersNewGameForm(forms.ModelForm):
    game = JSONField()

    class Meta:
        model = Settlers
        fields = ['game', 'player_profiles']
        widgets = {
            'player_profiles': forms.CheckboxSelectMultiple
        }
        labels = {
            'player_profiles': 'Players'
        }

    def save(self):
        instance = super().save()
        player_profiles = list(instance.player_profiles.all())
        random.shuffle(player_profiles)

        colors = ['red', 'blue', 'orange', 'white']
        if len(player_profiles) > 4:
            colors.extend(['green', 'brown'])
        random.shuffle(colors)

        players = []
        for profile in player_profiles:
            player_color = None
            if profile.favorite_colors:
                for color in profile.favorite_colors.split(','):
                    if color in colors:
                        player_color = color
                        break
            player_color = player_color or colors[0]
            players.append({'id': profile.user.id, 'name': str(profile), 'color': player_color})
            colors.remove(player_color)

        instance.game['players'] = players
        instance.game['turns'] = []
        instance.save()
        return instance

    def clean_player_profiles(self):
        player_profiles = self.cleaned_data['player_profiles']
        print(player_profiles)
        if len(player_profiles) not in [3,4]:
            raise forms.ValidationError('You must select 3 or 4 players to begin')

        return player_profiles


class SettlersTurnForm(forms.ModelForm):
    turn = JSONField()
    trade = JSONField(required=False)

    class Meta:
        model = Settlers
        fields = ['turn', 'trade']

    def clean(self):
        turn = self.cleaned_data['turn']
        if turn['roll'] != self.instance.game['nextRoll']:
            raise SubmitError(400)

        return self.cleaned_data


class SettlersAcceptTradeForm(forms.ModelForm):
    response = JSONField()

    class Meta:
        model = Settlers
        fields = ['response']
