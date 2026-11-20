import sys
import os

# Añadir el directorio raíz al path para que Python encuentre el módulo 'backend'
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from backend.main import app
