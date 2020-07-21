import random
from datetime import timedelta

from django.core import mail
from django.db import models
from django.urls import reverse
from django.conf import settings
from django.utils import timezone
from django.template import loader
from django.contrib.auth import get_user_model
from django.utils.functional import cached_property

from django_extensions.db.fields.json import JSONField

User = get_user_model()
TRADE_TIMEDELTA = timedelta(hours=12)
COLOR_CHOICES = 'blue red orange white brown green'.split()


def random_roll():
    return random.randint(1, 6) + random.randint(1, 6)


class SettlersProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    favorite_colors = models.CharField(blank=True, max_length=35)

    def __str__(self):
        return self.user.username

    @property
    def email(self):
        return self.user.email

    @property
    def name(self):
        return self.user.username

    @staticmethod
    def for_user(user):
        try:
            return user.settlersprofile
        except SettlersProfile.DoesNotExist:
            return None


class Settlers(models.Model):
    player_profiles = models.ManyToManyField(SettlersProfile, blank=True)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    game = JSONField()

    class Meta:
        verbose_name = "Settlers Game"
        verbose_name_plural = "Settlers Games"

    def get_absolute_url(self):
        return reverse('settlers:demo') if self.id == 1 else reverse(
            'settlers:detail',
            kwargs={'pk': self.pk}
        )

    def get_player_by_color(self, color):
        for player in self.game['players']:
            if player['color'] == color:
                return player

    @property
    def stage(self):
        n_players = len(self.game['players'])
        n_turns = len(self.game['turns'])

        if n_turns >= n_players * 2:
            return 'play'

        if n_turns >= n_players:
            return 'init2'

        return 'init1'

    @property
    def is_sync(self):
        return self.game.get('isSync', True)

    @is_sync.setter
    def is_sync(self, value):
        self.game['isSync'] = bool(value)
        self.save()

    @property
    def active_player(self):
        game = self.game
        n_turns = len(game['turns'])
        n_players = len(game['players'])

        offset = n_turns % n_players
        if n_turns >= n_players and n_turns < n_players * 2:
            offset = ~offset

        return game['players'][offset]

    def users_other_than(self, exclude_id):
        return [
            p.user for p in self.player_profiles.select_related('user').exclude(
                user__pk=exclude_id
            )
        ]

    def send_email(self, user, player, name='turn', extras=None):
        extras = extras or {}
        extras.update({
            'game': self,
            'user': user,
            'player': player
        })

        message = loader.render_to_string(f'settlers/emails/{name}.txt', extras)
        html_message = loader.render_to_string(f'settlers/emails/{name}.html', {
            'game': self,
            'user': user,
            'player': player
        })

        mail.send_mail(
            f'Settlers game #{self.id} update',
            message,
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            html_message=html_message
        )

    def save_next_turn(self, next_turn):
        player = self.active_player
        next_turn['played'] = timezone.now().isoformat()
        self.game['turns'].append(next_turn)
        self.game.pop('nextRoll', None)
        self.save()

    def save_trade_offer(self, trade_offer, next_turn):
        now = timezone.now()
        self.game['tradeOffers'] = {
            'turn': next_turn,
            'offers': trade_offer,
            'created': now.isoformat(),
            'responses': [],
            'expires': now + TRADE_TIMEDELTA 
        }
        self.game.pop('nextRoll')
        self.save()

    def save_trade_response(self, response):
        if 'tradeOffers' not in self.game:
            return False

        response['created'] = timezone.now()
        self.game['tradeOffers']['responses'] = [response] + [
            r for r
            in self.game['tradeOffers']['responses']
            if r['color'] != response['color']
        ]
        self.save()
        return True

    def start_next_turn(self):
        if 'tradeOffers' in self.game:
            if 'nextRoll' in self.game:
                self.game.pop('nextRoll')
                self.save()
        else:
            if self.stage != 'play':
                self.game['nextRoll'] = None
                self.save()
            else:
                if self.game.get('nextRoll') is None:
                    self.game['nextRoll'] = random_roll()
                    self.save()
