from django import forms
from django.core.validators import RegexValidator

class CheckoutForm(forms.Form):
    first_name = forms.CharField(
        max_length=20,
        required=True,
        label="שם פרטי",
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'שם פרטי'}),
    )
    last_name = forms.CharField(
        max_length=20,
        required=True,
        label="שם משפחה",
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'שם משפחה'}),
    )
    email = forms.EmailField(
        label="אימייל",
        required=False,
        validators=[RegexValidator(r'^[\w\.-]+@[\w\.-]+\.\w+$', 'הזן אימייל תקין')],
        widget=forms.EmailInput(attrs={'class': 'form-control', 'placeholder': 'אימייל'}),
    )
    phone = forms.CharField(
        max_length=20,
        required=True,
        label="טלפון",
        validators=[RegexValidator(r'^\d{9,10}$', 'הזן מספר טלפון תקין')],
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'טלפון'}),
    )
    city = forms.CharField(
        max_length=50,
        label="עיר",
        required=True,
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'עיר'}),
    )
    street = forms.CharField(
        max_length=100,
        label="רחוב",
        required=True,
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'רחוב'}),
    )
    house_number = forms.CharField(
        max_length=10,
        label="מספר בית",
        required=True,
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'מספר בית'}),
    )
    address_extra = forms.CharField(
        max_length=100,
        label="הערות לכתובת (לא חובה)",
        required=False,
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'הערות לכתובת'}),
    )