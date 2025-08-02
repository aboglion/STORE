from django.shortcuts import render, redirect
from django.contrib import messages
from django.contrib.auth import authenticate, login, logout
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json

from .forms import UserRegistrationForm, UserLoginForm, ManagerLoginForm, EditProfileForm
from accounts.models import User

# Firebase imports
import firebase_admin
from firebase_admin import auth, credentials

# Initialize Firebase app from serviceAccountKey.json file
import os
if not firebase_admin._apps:
    key_path = os.path.join(os.path.dirname(__file__), "../serviceAccountKey.json")
    cred = credentials.Certificate(key_path)
    firebase_admin.initialize_app(cred)

def verify_firebase_token(access_token):
    try:
        decoded_token = auth.verify_id_token(access_token)
        return decoded_token
    except Exception:
        return None

def create_manager():
    """
    to execute once on startup:
    this function will call in online_shop/urls.py
    """
    if not User.objects.filter(phone="+972541234567").first():
        user = User.objects.create_user(
            phone="+972541234567",
            password="manager123"
        )
        user.is_manager = True
        user.save()

def user_logout(request):
    logout(request)
    messages.success(request, "התנתקת בהצלחה")
    return redirect('shop:home_page')

def manager_login(request):
    if request.method == 'POST':
        form = ManagerLoginForm(request.POST)
        if form.is_valid():
            phone = form.cleaned_data['phone']
            user = User.objects.filter(phone=phone).first()
            if phone == "+972541234567":
                if user is None:
                    user = User.objects.create_user(phone)
                    user.is_manager = True
                    user.save()
                login(request, user)
                return redirect('dashboard:products')
            elif user is not None and user.is_manager:
                login(request, user)
                return redirect('dashboard:products')
            else:
                messages.error(
                    request, 'מספר טלפון לא נכון', 'danger'
                )
                return redirect('accounts:manager_login')
    else:
        form = ManagerLoginForm()
    context = {'form': form}
    return render(request, 'manager_login.html', context)

def user_register(request):
    if request.method == 'POST':
        form = UserRegistrationForm(request.POST)
        if form.is_valid():
            data = form.cleaned_data
            user = User.objects.create_user(
                data['phone']
            )
            return redirect('accounts:user_login')
    else:
        form = UserRegistrationForm()
    context = {'title':'Signup', 'form':form}
    return render(request, 'register.html', context)

@csrf_exempt
def firebase_login(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST only"}, status=405)
    try:
        data = json.loads(request.body)
        access_token = data.get("accessToken")
        if not access_token:
            return JsonResponse({"error": "Missing accessToken"}, status=400)
        decoded_token = verify_firebase_token(access_token)
        if not decoded_token:
            return JsonResponse({"error": "Invalid accessToken"}, status=401)
        # --- יצירת/כניסה ליוזר ---
        phone = decoded_token.get("phone_number")
        if not phone:
            return JsonResponse({"error": "No phone number in token"}, status=400)
        from accounts.models import User
        user, created = User.objects.get_or_create(phone=phone)
        if created:
            user.is_active = True
            user.save()
        login(request, user)
        return JsonResponse({
            "status": "authenticated",
            "firebase_uid": decoded_token.get("uid"),
            "phone": phone,
            "user_created": created
        })
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)

def user_login(request):
    if request.method == 'POST':
        form = UserLoginForm(request.POST)
        if form.is_valid():
            data = form.cleaned_data
            user = authenticate(
                request, email=data['email'], password=data['password']
            )
            if user is not None:
                login(request, user)
                return redirect('home_page')
            else:
                messages.error(
                    request, 'username or password is wrong', 'danger'
                )
                return redirect('accounts:user_login')
        context = {'title':'Login', 'form': form}
        return render(request, 'login.html', context)
    else:
        form = UserLoginForm()
        context = {'title':'Login', 'form': form}
        return render(request, 'login.html', context)

def edit_profile(request):
    if request.method == 'POST':
        form = EditProfileForm(request.POST, instance=request.user)
        if form.is_valid():
            form.save()
            messages.success(request, 'הפרופיל עודכן בהצלחה')
            return redirect('accounts:edit_profile')
    else:
        form = EditProfileForm(instance=request.user)
    context = {'form': form}
    return render(request, 'edit_profile.html', context)
    context = {'title':'Login', 'form': form}
    return render(request, 'login.html', context)

def user_logout(request):
    logout(request)
    return redirect('accounts:user_login')