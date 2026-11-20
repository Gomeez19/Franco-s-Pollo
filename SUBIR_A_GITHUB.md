## 📤 CÓMO SUBIR A GITHUB

Tienes el repositorio Git local listo (commit `161569f`).
Para subir a GitHub, sigue estos pasos:

### Paso 1: Crear el repositorio en GitHub
1. Ve a https://github.com/new
2. Nombre del repositorio: `francos-pollo` (o el que prefieras)
3. Visibilidad: **Privado** (recomendado, contiene credenciales)
4. NO marques "Add README" ni ninguna opción extra
5. Clic en **"Create repository"**

### Paso 2: Conectar y subir desde PowerShell
Abre PowerShell como administrador y ejecuta estos comandos:

```powershell
cd "C:\Franco's Pollo"

# Reemplaza TU_USUARIO con tu nombre de usuario de GitHub
git remote add origin https://github.com/TU_USUARIO/francos-pollo.git

git branch -M main

git push -u origin main
```

### Paso 3: Autenticación
Cuando te pida credenciales:
- **Usuario**: tu correo de GitHub
- **Contraseña**: usa un **Personal Access Token** (no la contraseña de GitHub)
  - Ve a: https://github.com/settings/tokens/new
  - Selecciona permisos: `repo` (todos)
  - Genera y copia el token

### ⚠️ Importante - El archivo .env
El archivo `.env` contiene las credenciales de la base de datos Neon.
Está incluido en este primer commit para que el proyecto funcione, pero si
vas a compartir el repositorio públicamente, agrégalo al `.gitignore` primero.

---
*Generado automáticamente por el asistente de desarrollo - Franco's Pollo*
