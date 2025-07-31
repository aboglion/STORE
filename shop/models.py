from django.db import models
from django.urls import reverse
from django.template.defaultfilters import slugify


class Category(models.Model):
    title = models.CharField(max_length=200)
    sub_category = models.ForeignKey(
        'self', on_delete=models.CASCADE,
        related_name='sub_categories', null=True, blank=True
    )
    is_sub = models.BooleanField(default=False)
    slug = models.SlugField(max_length=200, unique=True)

    def __str__(self):
        return self.title

    def get_absolute_url(self):
        return reverse('shop:product_detail', kwargs={'slug':self.slug})

    def save(self, *args, **kwargs): # new
        base_slug = slugify(self.title)
        slug = base_slug
        counter = 1
        while Category.objects.filter(slug=slug).exclude(pk=self.pk).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1
        self.slug = slug
        return super().save(*args, **kwargs)
        

class Product(models.Model):
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_DEFAULT,
        default=1,  # ID of default category, ensure this exists
        related_name='category'
    )
    image = models.ImageField(upload_to='products')
    title = models.CharField(max_length=250)
    description = models.TextField()
    price = models.IntegerField()
    date_created = models.DateTimeField(auto_now_add=True)
    slug = models.SlugField(unique=True)

    class Meta:
        ordering = ('-date_created',)

    def __str__(self):
        return self.slug
        
    def get_absolute_url(self):
        return reverse('shop:product_detail', kwargs={'slug':self.slug})

    def save(self, *args, **kwargs):
        from django.utils.text import slugify
        from re import sub
        # If slug is empty, generate from title
        base_slug = self.slug if self.slug else slugify(self.title)
        base_slug = sub(r'[^a-zA-Z0-9_-]', '', base_slug)
        unique_slug = base_slug
        num = 1
        while Product.objects.filter(slug=unique_slug).exclude(pk=self.pk).exists():
            unique_slug = f"{base_slug}-{num}"
            num += 1
        self.slug = unique_slug
        super().save(*args, **kwargs)