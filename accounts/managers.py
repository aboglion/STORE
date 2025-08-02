from django.contrib.auth.models import BaseUserManager


class UserManager(BaseUserManager):
    def create_user(self, phone, password=None):
        if not phone:
            raise ValueError('Phone is required!')

        user = self.model(phone=phone)
        if password:
            user.set_password(password)
        user.save(using=self.db)
        return user

    def create_superuser(self, phone, password=None):
        user = self.create_user(phone, password)
        user.is_admin = True
        user.save(using=self.db)
        return user
