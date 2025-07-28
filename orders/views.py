from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required

from django.views.decorators.http import require_POST
from django.utils import timezone

from .models import Order, OrderItem
from cart.utils.cart import Cart
from .forms import CheckoutForm


@login_required
def create_order(request):
    cart = Cart(request)
    order = Order.objects.create(user=request.user)
    for item in cart:
        OrderItem.objects.create(
            order=order, product=item['product'],
            price=item['price'], quantity=item['quantity']
    )
    return redirect('orders:checkout', order_id=order.id)



@login_required
def checkout(request, order_id):
    order = get_object_or_404(Order, id=order_id)
    if request.method == 'POST':
        form = CheckoutForm(request.POST)
        if form.is_valid():
            order.phone = form.cleaned_data['phone']
            order.city = form.cleaned_data['city']
            order.street = form.cleaned_data['street']
            order.house_number = form.cleaned_data['house_number']
            order.address_extra = form.cleaned_data['address_extra']
            order.save()
            return redirect('orders:pay_order', order_id=order.id)
    else:
        form = CheckoutForm(initial={
            'phone': order.phone,
            'city': order.city,
            'street': order.street,
            'house_number': order.house_number,
            'address_extra': order.address_extra,
        })
    context = {'title': 'Checkout', 'order': order, 'form': form}
    return render(request, 'checkout.html', context)


@login_required
def fake_payment(request, order_id):
    cart = Cart(request)
    cart.clear()
    order = get_object_or_404(Order, id=order_id)
    order.status = True
    order.save()
    return redirect('orders:user_orders')


@login_required
def user_orders(request):
    orders = request.user.orders.all()
    context = {'title':'Orders', 'orders': orders}
    return render(request, 'user_orders.html', context)