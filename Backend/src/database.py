from flask_sqlalchemy import SQLAlchemy

# Cria uma instância do SQLAlchemy que será usada em toda a aplicação.
# Esta instância será posteriormente vinculada à aplicação Flask
# através do método `db.init_app(app)`.
db = SQLAlchemy() 