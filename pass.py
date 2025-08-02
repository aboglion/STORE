import os
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend

# Define file names
SERVICE_ACCOUNT_KEY_FILE = "serviceAccountKey.json"
ENCRYPTED_FILE = "serviceAccountKey.json.encrypted"
PASSWORD_FILE = ".env"

def get_password_from_file(filename):
    """Reads a password from a file."""
    try:
        with open(filename, "r") as f:
            password = f.read().strip()
            if not password:
                raise ValueError("The password file is empty.")
            return password.encode()
    except FileNotFoundError:
        print(f"Error: The password file '{filename}' was not found.")
        print(f"Please create a file named '{filename}' in the same directory and place your password inside it.")
        exit()
    except ValueError as e:
        print(f"Error: {e}")
        exit()

def derive_key_from_password(password, salt):
    """Derives a secure encryption key from the password and salt."""
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=480000,
        backend=default_backend()
    )
    return base64.urlsafe_b64encode(kdf.derive(password))

def encrypt_file():
    """Encrypts the serviceAccountKey.json file."""
    try:
        password = get_password_from_file(PASSWORD_FILE)
        salt = os.urandom(16)
        key = derive_key_from_password(password, salt)
        fernet = Fernet(key)

        with open(SERVICE_ACCOUNT_KEY_FILE, "rb") as file:
            file_data = file.read()
        
        encrypted_data = fernet.encrypt(file_data)

        with open(ENCRYPTED_FILE, "wb") as file:
            file.write(salt + encrypted_data)
        
        # Delete the original file after successful encryption
        os.remove(SERVICE_ACCOUNT_KEY_FILE)
        
        print(f"File '{SERVICE_ACCOUNT_KEY_FILE}' encrypted successfully to '{ENCRYPTED_FILE}'.")
        print(f"The original file has been deleted to prevent accidental commits.")
        print("\nYou can now safely commit and push 'serviceAccountKey.json.encrypted' to GitHub.")
        print("IMPORTANT: Make sure to add 'serviceAccountKey.json' and '.env' to your .gitignore file!")

    except Exception as e:
        print(f"An error occurred during encryption: {e}")

def decrypt_file():
    """Decrypts the serviceAccountKey.json.encrypted file."""
    if not os.path.exists(ENCRYPTED_FILE):
        print(f"Error: Encrypted file '{ENCRYPTED_FILE}' not found. Cannot decrypt.")
        return

    password = get_password_from_file(PASSWORD_FILE)

    try:
        with open(ENCRYPTED_FILE, "rb") as file:
            file_data = file.read()
        
        salt = file_data[:16]
        encrypted_data = file_data[16:]
        
        key = derive_key_from_password(password, salt)
        fernet = Fernet(key)

        decrypted_data = fernet.decrypt(encrypted_data)
        with open(SERVICE_ACCOUNT_KEY_FILE, "wb") as file:
            file.write(decrypted_data)
        
        # Delete the encrypted file after successful decryption
        os.remove(ENCRYPTED_FILE)

        print(f"File '{ENCRYPTED_FILE}' decrypted successfully to '{SERVICE_ACCOUNT_KEY_FILE}'.")
        print(f"The encrypted file has been deleted.")
        print("You can now use the original JSON key.")
        
    except Exception as e:
        print("\n--- DECRYPTION FAILED ---")
        print(f"The password in '{PASSWORD_FILE}' is incorrect or the file is corrupted.")
        print(f"Please check the password and try again.")

def main():
    """The main function that identifies the state and acts accordingly."""
    
    if os.path.exists(SERVICE_ACCOUNT_KEY_FILE):
        print("Found unencrypted JSON key file.")
        print("Encrypting...")
        encrypt_file()
    
    elif os.path.exists(ENCRYPTED_FILE):
        print("Found encrypted key file.")
        print("Decrypting...")
        decrypt_file()
        
    else:
        print("No files to work with. Make sure either 'serviceAccountKey.json' or 'serviceAccountKey.json.encrypted' exist in the current directory.")

if __name__ == "__main__":
    main()