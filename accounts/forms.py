from django import forms

from .models import User


class UserLoginForm(forms.Form):
    phone = forms.CharField(
        widget=forms.TextInput(
            attrs={'class': 'form-control', 'placeholder': 'מספר טלפון'}
        )
    )


class UserRegistrationForm(forms.Form):
    phone = forms.CharField(
        widget=forms.TextInput(
            attrs={'class': 'form-control', 'placeholder': 'מספר טלפון'}
        )
    )


class ManagerLoginForm(forms.Form):
    phone = forms.CharField(
        widget=forms.TextInput(
            attrs={'class': 'form-control', 'placeholder': 'מספר טלפון'}
        )
    )


class EditProfileForm(forms.ModelForm):
    class Meta:
        model = User
        fields = ['phone']
