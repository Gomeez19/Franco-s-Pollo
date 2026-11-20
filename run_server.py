import sys
import types

# Ensure ssl compatibility if Windows Python installation lacks OpenSSL DLLs in PATH
try:
    import ssl
except ImportError:
    class FakeSSL(types.ModuleType):
        PROTOCOL_TLS_SERVER = 1
        PROTOCOL_TLS_CLIENT = 2
        PROTOCOL_TLS = 3
        CERT_NONE = 0
        CERT_OPTIONAL = 1
        CERT_REQUIRED = 2
        
        class SSLWantReadError(Exception): pass
        class SSLSyscallError(Exception): pass
        class SSLError(Exception): pass
        class SSLZeroReturnError(Exception): pass
        class SSLWantWriteError(Exception): pass
        class MemoryBIO: pass
        class SSLContext: pass
        class SSLSocket: pass
        
        @staticmethod
        def create_default_context(*args, **kwargs):
            return None

    fake_ssl = FakeSSL('ssl')
    fake_ssl.__name__ = 'ssl'
    fake_ssl.__doc__ = 'Compatibility fallback for environments where _ssl binary is absent.'
    sys.modules['ssl'] = fake_ssl

import uvicorn

if __name__ == "__main__":
    print("=" * 60)
    print("Iniciando FRANCO'S POLLO - Plataforma Web Integral")
    print("Acceso Clientes: http://127.0.0.1:8000")
    print("Acceso Administrador: http://127.0.0.1:8000/admin")
    print("Documentacion Swagger API: http://127.0.0.1:8000/docs")
    print("=" * 60)
    
    # Run uvicorn HTTP server
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
