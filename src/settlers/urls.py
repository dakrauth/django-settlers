from django.urls import path

from . import views


app_name = 'settlers'

urlpatterns = [
    path('', views.ListingView.as_view(), name='listing'),
    path('demo/', views.GameDemoView.as_view(), name='demo'),
    path('random/', views.RandomView.as_view(), name='random'),
    path('new/', views.NewView.as_view(), name='new'),
    path('<int:pk>/', views.GameDetailView.as_view(), name='detail'),
    path('<int:pk>/data/', views.game_state, name='detail-data'),
    path('<int:pk>/email/', views.game_email, name='detail-email')
]
