from flask import Flask, render_template, request, redirect, url_for
from flask_sqlalchemy import SQLAlchemy

# Initialize Flask app
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///ipl.db'
app.config['SECRET_KEY'] = 'your_secret_key'

db = SQLAlchemy(app)

# Database Models
class Team(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    team_name = db.Column(db.String(50), nullable=False)
    logo_url = db.Column(db.String(200), nullable=False)
    matches_played = db.Column(db.Integer, default=0)
    wins = db.Column(db.Integer, default=0)
    losses = db.Column(db.Integer, default=0)
    nrr = db.Column(db.Float, default=0.0)
    points = db.Column(db.Integer, default=0)

# Routes
@app.route('/')
def home():
    teams = Team.query.all()
    return render_template('index.html', teams=teams)

@app.route('/add-team', methods=['GET', 'POST'])
def add_team():
    if request.method == 'POST':
        team_name = request.form['team_name']
        logo_url = request.form['logo_url']
        new_team = Team(team_name=team_name, logo_url=logo_url)
        db.session.add(new_team)
        db.session.commit()
        return redirect(url_for('home'))
    return render_template('add_team.html')

@app.route('/edit-team/<int:team_id>', methods=['GET', 'POST'])
def edit_team(team_id):
    team = Team.query.get_or_404(team_id)
    if request.method == 'POST':
        team.matches_played = int(request.form['matches_played'])
        team.wins = int(request.form['wins'])
        team.losses = int(request.form['losses'])
        team.nrr = float(request.form['nrr'])
        team.points = int(request.form['points'])
        db.session.commit()
        return redirect(url_for('home'))
    return render_template('edit_team.html', team=team)


if __name__ == '__main__':
    with app.app_context():
        db.create_all()  # Create database tables
    app.run(debug=True)
