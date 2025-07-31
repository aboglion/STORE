from django.db import migrations

def create_default_category(apps, schema_editor):
    Category = apps.get_model('shop', 'Category')
    if not Category.objects.filter(id=1).exists():
        Category.objects.create(id=1, title='Default', slug='default')

class Migration(migrations.Migration):

    dependencies = [
        ('shop', '0008_alter_product_slug'),
    ]

    operations = [
        migrations.RunPython(create_default_category),
    ]