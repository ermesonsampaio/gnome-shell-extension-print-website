MODULES=extension.js locale/ metadata.json stylesheet.css LICENSE README.md prefs.js schemas/
INSTALLPATH=~/.local/share/gnome-shell/extensions/print-website@ermeso.com/

all: compile-locales compile-settings

compile-settings:
	@glib-compile-schemas --strict --targetdir=schemas/ schemas

compile-locales: locale
	@$(foreach file, $(wildcard locale/*/LC_MESSAGES/*.po), \
		msgfmt $(file) -o $(subst .po,.mo,$(file));)

update-po-files:
	@xgettext -L Python --from-code=UTF-8 -k_ -kN_ -o clipboard-indicator.pot *.js
	@$(foreach file, $(wildcard locale/*/LC_MESSAGES/*.po), \
		msgmerge $(file) clipboard-indicator.pot -o $(file);)

bundle: all
	@$(zip -r bundle.zip $(MODULES))