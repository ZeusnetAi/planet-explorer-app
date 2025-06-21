#!/usr/bin/env python3
"""
Script de configuração para o Planet API Backend
"""

import os
import shutil

def create_env_file():
    """Cria arquivo .env baseado no env.example"""
    if os.path.exists('.env'):
        print("⚠️  Arquivo .env já existe!")
        response = input("Deseja sobrescrever? (y/N): ")
        if response.lower() != 'y':
            print("❌ Configuração cancelada")
            return False
    
    try:
        shutil.copy('env.example', '.env')
        print("✅ Arquivo .env criado com sucesso!")
        print("🔑 Sua chave da Planet API já está configurada:")
        print("   PLANET_API_KEY=PLAK7aff885520da45a68765d35f1a74289d")
        return True
    except Exception as e:
        print(f"❌ Erro ao criar arquivo .env: {e}")
        return False

def create_directories():
    """Cria diretórios necessários"""
    directories = ['logs', 'uploads']
    
    for directory in directories:
        if not os.path.exists(directory):
            try:
                os.makedirs(directory)
                print(f"✅ Diretório '{directory}' criado")
            except Exception as e:
                print(f"❌ Erro ao criar diretório '{directory}': {e}")

def main():
    """Função principal do script"""
    print("🚀 Configurando Planet API Backend...")
    print("=" * 50)
    
    # Criar diretórios
    create_directories()
    
    # Criar arquivo .env
    if create_env_file():
        print("\n🎉 Configuração concluída!")
        print("\n📋 Próximos passos:")
        print("1. Ative o ambiente virtual:")
        print("   source venv/bin/activate  # Linux/Mac")
        print("   venv\\Scripts\\activate     # Windows")
        print("\n2. Instale as dependências:")
        print("   pip install -r requirements.txt")
        print("\n3. Execute a aplicação:")
        print("   python src/main.py")
        print("\n🌐 A aplicação estará disponível em: http://localhost:5000")
    else:
        print("\n❌ Configuração falhou!")

if __name__ == "__main__":
    main() 