from django.contrib import admin
from django.urls import path, include
from dashboard.views import home_page
from django.conf import settings
from django.conf.urls.static import static


urlpatterns = [
    path('admin/', admin.site.urls),
    path('', home_page, name='home_page'),
    path('accounts/', include('accounts.urls', namespace='accounts')),
    path('cart/', include('cart.urls', namespace='cart')),
    path('orders/', include('orders.urls', namespace='orders')),
    path('dashboard/', include('dashboard.urls', namespace='dashboard')),
    path('shop/', include('shop.urls', namespace='shop')),
    # path('', include('shop.urls', namespace='shop')),  # Removed shop root
]


if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)