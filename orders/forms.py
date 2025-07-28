from django import forms

class CheckoutForm(forms.Form):
    phone = forms.CharField(
        max_length=20,
        label="טלפון",
        required=True,
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