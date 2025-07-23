.PHONY: run push reset

run:
	pip install -r requirements.txt
	python manage.py migrate
	python manage.py runserver

push:
	git add .
	git commit -m "update"
	git push

reset:
	cd STORE
	git reset --hard
	git clean -fd
	git pull
	cd ..