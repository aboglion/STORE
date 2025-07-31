from django.urls import path

from dashboard import views

app_name = 'dashboard'

urlpatterns = [
    path('products', views.products, name='products'),
    path('products/category/<int:category_id>/', views.products_by_category, name='products_by_category'),
    path('products/delete/<int:id>', views.delete_product, name='delete_product'),
    path('products/edit/<int:id>', views.edit_product, name='edit_product'),
    path('orders', views.orders, name='orders'),
    path('orders/detail/<int:id>', views.order_detail, name='order_detail'),
    path('add-product/', views.add_product, name='add_product'),
    path('add-category/', views.add_category, name='add_category'),
    path('order-items', views.order_items, name='order_items'),
    path('categories', views.categories, name='categories'),
    path('users', views.users, name='users'),
    path('categories/edit/<int:id>', views.edit_category, name='edit_category'),
    path('categories/delete/<int:id>', views.delete_category, name='delete_category'),
]
