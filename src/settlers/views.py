from django import http
from django.contrib import messages
from django.contrib.auth.mixins import AccessMixin
from django.utils.functional import cached_property
from django.core.exceptions import ObjectDoesNotExist
from django.shortcuts import render, get_object_or_404

from vanilla import TemplateView, DetailView, UpdateView, CreateView

from .models import Settlers, SettlersProfile
from .forms import SubmitError, SettlersTurnForm, SettlersNewGameForm, SettlersAcceptTradeForm
from . import __version__ as VERSION


class SettlersMixin:

    @cached_property
    def settlers_profile(self):
        if self.request.user.is_authenticated:
            try:
                return self.request.user.settlersprofile
            except ObjectDoesNotExist:
                pass

        return None

    def get_context_data(self, **kwargs):
        version_string = '.'.join(str(i) for i in VERSION)
        return super().get_context_data(version=version_string, **kwargs)


class RandomView(SettlersMixin, TemplateView):
    template_name = 'settlers/random.html'


class ListingView(SettlersMixin, TemplateView):
    template_name = 'settlers/listing.html'

    def get_context_data(self, **kwargs):
        return super().get_context_data(
            games=Settlers.objects.order_by('-updated'),
            **kwargs
        )


class NewView(AccessMixin, SettlersMixin, CreateView):
    model = Settlers
    template_name = 'settlers/new.html'
    form_class = SettlersNewGameForm

    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            return self.handle_no_permission()

        if not self.settlers_profile:
            return http.HttpResponse(status=403)

        return super().dispatch(request, *args, **kwargs)


class BaseGameView(SettlersMixin, UpdateView):
    model = Settlers
    form_class = SettlersTurnForm
    accept_trade_form_class = SettlersAcceptTradeForm
    template_name = 'settlers/game.html'

    @cached_property
    def object(self):
        return self.get_object()

    @cached_property
    def active_player(self):
        return self.object.active_player

    @cached_property
    def is_user_active_player(self):
        return (
            self.request.user.is_authenticated and 
            self.active_player['id'] == self.request.user.id
        )

    @cached_property
    def is_user_player(self):
        if not self.request.user.is_authenticated:
            return False

        profile = SettlersProfile.for_user(self.request.user)
        if not profile:
            return False

        return profile.settlers_set.filter(pk=self.object.pk).exists()


class GameDetailView(BaseGameView):

    def get_form_class(self):
        if self.is_user_active_player:
            return self.form_class
        elif self.is_user_player:
            if 'tradeOffers' in self.object.game:
                return self.accept_trade_form_class
        return None

    def get_form(self, data=None, files=None, **kwargs):
        """
        Returns a form instance.
        """
        cls = self.get_form_class()
        return cls(data=data, files=files, **kwargs) if cls else None

    def start_next_turn(self):
        request = self.request
        if not self.is_user_player:
            return

        if self.is_user_active_player:
            self.object.start_next_turn()

        self.object.game['user'] = request.user.id

    def send_notifications(self, name, extras=None):
        active = self.active_player
        extras = extras or {}
        others = self.object.users_other_than(active['id'])
        for p in others:
            try:
                self.object.send_email(p, active['name'], name, extras)
            except Exception as why:
                messages.warning(self.request, f'Unable to email {p} ({why})')

    def form_valid(self, form):
        if 'response' in form.cleaned_data:
            result = self.object.save_trade_response(form.cleaned_data['response'])
            if result:
                messages.success(self.request, 'Your trade response has been successfully saved.')
            else:
                messages.error(self.request, 'Count not save your trade response')
        else:
            if self.request.user.id != self.active_player['id']:
                raise SubmitError(403)

            if form.cleaned_data['trade']:
                self.object.save_trade_offer(form.cleaned_data['trade'], form.cleaned_data['turn'])
                messages.success(self.request, 'Your trade offer has been successfully saved.')
                self.send_notifications('trade')
            else:
                self.object.save_next_turn(form.cleaned_data['turn'])
                messages.success(self.request, 'Your turn has been successfully saved.')
                self.send_notifications('turn')

        return http.HttpResponseRedirect(self.get_success_url())

    def validate_form(self, form):
        if not self.request.user.is_authenticated:
            raise SubmitError(401)

        if form.is_valid():
            if 'turn' in form.cleaned_data:
                if form.cleaned_data['turn']['roll'] != self.object.game['nextRoll']:
                    raise SubmitError(400)

            return self.form_valid(form)

        return self.form_invalid(form)

    def get_context_data(self, **kwargs):
        return super().get_context_data(game=self.object.game, **kwargs)

    def get(self, request, *args, **kwargs):
        self.start_next_turn()
        form = self.get_form(instance=self.object)
        context = self.get_context_data(form=form)
        return self.render_to_response(context)

    def post(self, request, *args, **kwargs):
        form = self.get_form(data=request.POST, instance=self.object)
        try:
            return self.validate_form(form)
        except SubmitError as exc:
            return http.HttpResponse(status=exc.args[0])


class GameDemoView(GameDetailView):

    @cached_property
    def is_user_player(self):
        return True

    @cached_property
    def is_user_active_player(self):
        return True

    def get_object(self):
        return Settlers.objects.get(pk=1)

    def validate_form(self, form):
        if form.is_valid():
            return self.form_valid(form)
        return self.form_invalid(form)

    def start_next_turn(self):
        active_player = self.active_player
        self.object.start_next_turn()
        self.object.game['user'] = active_player['id']

    def send_notifications(self, name, extras=None):
        pass


def game_email(request, pk):
    obj = get_object_or_404(Settlers, pk=pk)
    players = [pp.user for pp in obj.player_profiles.select_related('user')]
    return render(request, 'settlers/emails/turn.html', {
        'game': obj,
        'user': players[0],
        'player':  players[1]
    })


def game_state(request, pk):
    obj = get_object_or_404(Settlers, pk=pk)
    return http.JsonResponse(obj.game, json_dumps_params={'indent': 4})

