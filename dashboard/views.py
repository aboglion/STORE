from orders.models import Order
import calendar
from datetime import datetime
from django.db.models import Q
from shop.models import Product
from shop.views import paginat

def home_page(request):
    from shop.models import Category
    products = Product.objects.all()
    categories = Category.objects.filter(sub_category__isnull=True, is_sub=False)
    context = {
        'products': paginat(request, products),
        'categories': categories
    }
    return render(request, 'home_page.html', context)
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.contrib.auth.decorators import user_passes_test
from django.http import Http404

from shop.models import Product
from accounts.models import User
from orders.models import Order, OrderItem
from .forms import AddProductForm, AddCategoryForm, EditProductForm


def is_manager(user):
    try:
        if not user.is_manager:
            raise Http404
        return True
    except:
        raise Http404


@user_passes_test(is_manager)
@login_required
def products(request):
    sort = request.GET.get('sort', '')
    allowed = ['title', '-title', 'price', '-price', 'category', '-category', 'date_created', '-date_created']
    if sort in allowed:
        products = Product.objects.all().order_by(sort)
    else:
        products = Product.objects.all()
    context = {'title':'Products', 'products':products, 'sort': sort}
    return render(request, 'products.html', context)


@user_passes_test(is_manager)
@login_required
def add_product(request):
    if request.method == 'POST':
        form = AddProductForm(request.POST, request.FILES)
        if form.is_valid():
            form.save()
            messages.success(request, 'Product added Successfuly!')
            return redirect('dashboard:add_product')
    else:
        form = AddProductForm()
    context = {'title':'Add Product', 'form':form}
    return render(request, 'add_product.html', context)


@user_passes_test(is_manager)
@login_required
def delete_product(request, id):
    product = Product.objects.filter(id=id).delete()
    messages.success(request, 'product has been deleted!', 'success')
    return redirect('dashboard:products')


@user_passes_test(is_manager)
@login_required
def edit_product(request, id):
    product = get_object_or_404(Product, id=id)
    if request.method == 'POST':
        form = EditProductForm(request.POST, request.FILES, instance=product)
        if form.is_valid():
            form.save()
            messages.success(request, 'Product has been updated', 'success')
            return redirect('dashboard:products')
    else:
        form = EditProductForm(instance=product)
    context = {'title': 'Edit Product', 'form':form}
    return render(request, 'edit_product.html', context)


@user_passes_test(is_manager)
@login_required
def add_category(request):
    if request.method == 'POST':
        form = AddCategoryForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, 'Category added Successfuly!')
            return redirect('dashboard:add_category')
    else:
        form = AddCategoryForm()
    context = {'title':'Add Category', 'form':form}
    return render(request, 'add_category.html', context)


@user_passes_test(is_manager)
@login_required
def orders(request):
    orders = Order.objects.all()
    search = request.GET.get('search', '').strip()
    sort = request.GET.get('sort', 'created')
    direction = request.GET.get('direction', 'desc')
    status = request.GET.get('status', '')
    months = request.GET.getlist('months')
    start_date = request.GET.get('start_date', '')
    end_date = request.GET.get('end_date', '')
    show_all = False
    if 'all' in months:
        show_all = True

    now = datetime.now()
    # Date filtering logic
    if not show_all and not (start_date or end_date):
        # Default: current month
        if not months:
            months = [f"{now.year}-{now.month:02d}"]
        month_filters = Q()
        for m in months:
            try:
                year, month = map(int, m.split('-'))
                start = datetime(year, month, 1)
                last_day = calendar.monthrange(year, month)[1]
                end = datetime(year, month, last_day, 23, 59, 59)
                month_filters |= Q(created__range=(start, end))
            except Exception:
                continue
        orders = orders.filter(month_filters)
    elif start_date or end_date:
        # Filter by date range
        if start_date and end_date:
            orders = orders.filter(created__range=[start_date, end_date])
        elif start_date:
            orders = orders.filter(created__gte=start_date)
        elif end_date:
            orders = orders.filter(created__lte=end_date)
    # else: show_all, no filter

    # Global search: all fields
    if search:
        orders = orders.filter(
            Q(user__full_name__icontains=search) |
            Q(id__icontains=search) |
            Q(phone__icontains=search) |
            Q(city__icontains=search) |
            Q(street__icontains=search) |
            Q(house_number__icontains=search) |
            Q(address_extra__icontains=search) |
            Q(status__icontains=search)
        )

    # Filter by status
    if status == 'success':
        orders = orders.filter(status=True)
    elif status == 'canceled':
        orders = orders.filter(status=False)

    # Sorting by any field
    sort_fields = {
        'user': 'user__full_name',
        'id': 'id',
        'price': None,  # handled below
        'status': 'status',
        'phone': 'phone',
        'city': 'city',
        'street': 'street',
        'house_number': 'house_number',
        'address_extra': 'address_extra',
        'created': 'created',
    }
    if sort == 'price':
        orders = sorted(orders, key=lambda o: o.get_total_price, reverse=(direction == 'desc'))
    elif sort in sort_fields and sort_fields[sort]:
        field = sort_fields[sort]
        if direction == 'desc':
            field = '-' + field
        orders = orders.order_by(field)
    else:
        orders = orders.order_by('-created')

    # For month selector: get all months with orders
    # ודא ש-all_months תמיד מחושב על QuerySet, לא על list
    if hasattr(orders, 'model'):
        all_months = orders.model.objects.dates('created', 'month', order='DESC')
    else:
        all_months = Order.objects.dates('created', 'month', order='DESC')

    context = {
        'title': 'Orders',
        'orders': orders,
        'search': search,
        'sort': sort,
        'direction': direction,
        'status': status,
        'months': months,
        'all_months': all_months,
        'show_all': show_all,
        'start_date': start_date,
        'end_date': end_date,
    }
    return render(request, 'orders.html', context)


@user_passes_test(is_manager)
@login_required
def order_detail(request, id):
    order = Order.objects.filter(id=id).first()
    items = OrderItem.objects.filter(order=order).all()
    context = {'title':'order detail', 'items':items, 'order':order}
    return render(request, 'order_detail.html', context)