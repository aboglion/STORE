from django.db import models

from accounts.models import User
from shop.models import Product


class Order(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders')
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    status = models.BooleanField(default=False)
    phone = models.CharField(max_length=20, blank=True, default='')
    city = models.CharField(max_length=50, blank=True, default='')
    street = models.CharField(max_length=100, blank=True, default='')
    house_number = models.CharField(max_length=10, blank=True, default='')
    address_extra = models.CharField(max_length=100, blank=True, default='')

    class Meta:
        ordering = ('-created',)

    def __str__(self):
        return f"{self.user.full_name} - order id: {self.id}"

    @property
    def get_total_price(self):
        total = sum(item.get_cost() for item in self.items.all())
        return total
    

class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='order_items')
    price = models.IntegerField()
    quantity = models.SmallIntegerField(default=1)

    def __str__(self):
        return str(self.id)

    def get_cost(self):
        return self.price * self.quantity