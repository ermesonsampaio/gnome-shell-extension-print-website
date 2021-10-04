const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;

const Gettext = imports.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Domain = Gettext.domain('print-website-indicator');

const _ = Domain.gettext;

var Fields = {
  API_KEY: 'api-key',
  API_KEY_BUFFER: 'api-key-buffer',
};

const SCHEMA_NAME = 'org.gnome.shell.extensions.print-website';

const getSchema = function () {
  let schemaDir = Me.dir.get_child('schemas').get_path();
  let schemaSource = Gio.SettingsSchemaSource.new_from_directory(schemaDir, Gio.SettingsSchemaSource.get_default(), false);
  let schema = schemaSource.lookup(SCHEMA_NAME, false);

  return new Gio.Settings({ settings_schema: schema });
};

var SettingsSchema = getSchema();

function init() {
  Gettext.bindtextdomain('print-website-indicator', Me.dir.get_child('locale').get_path());
  Gettext.textdomain('print-website-indicator');
}

function buildPrefsWidget() {
  const prefsWidget = new Gtk.Grid({
    margin_top: 18,
    margin_bottom: 18,
    margin_start: 18,
    margin_end: 18,
    column_spacing: 12,
    row_spacing: 12,
    column_spacing: 18,
    column_homogeneous: false,
    row_homogeneous: false,
  });

  const title = new Gtk.Label({
    label: `<b>${_(`${Me.metadata.name} Preferences`)}</b>`,
    halign: Gtk.Align.START,
    use_markup: true,
    visible: true,
  });
  prefsWidget.attach(title, 0, 0, 2, 1);

  const apiKeyActive = new Gtk.Label({
    label: `${_('API key active')}: <b>${SettingsSchema.get_string(Fields.API_KEY)}</b>`,
    halign: Gtk.Align.START,
    use_markup: true,
    visible: true,
  });

  const apiKeyActiveBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL });

  apiKeyActiveBox.append(apiKeyActive);

  const entryBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 30 });

  const entryLabel = new Gtk.Label({
    label: _('Your API key'),
    halign: Gtk.Align.START,
    visible: true,
  });

  const entry = new Gtk.Entry({
    visible: true,
  });

  if (SettingsSchema.get_string(Fields.API_KEY).length > 0) prefsWidget.attach(apiKeyActiveBox, 1, 1, 1, 1);
  entryBox.append(entryLabel);
  entryBox.append(entry);

  const buttonBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 30 });

  const buttonLabel = new Gtk.Label({
    label: _('Reload API key'),
    halign: Gtk.Align.START,
    visible: true,
  });

  const button = new Gtk.Button({
    label: _('Reload'),
    visible: true,
  });
  
  buttonBox.append(buttonLabel);
  buttonBox.append(button);

  prefsWidget.attach(entryBox, 1, 2, 1, 1);
  prefsWidget.attach(buttonBox, 1, 3, 1, 1);

  button.connect('clicked', () => {
    SettingsSchema.set_string(Fields.API_KEY, entry.get_buffer().text);
    apiKeyActive.set_label(`${_('API key active')}: <b>${SettingsSchema.get_string(Fields.API_KEY)}</b>`);
  });

  return prefsWidget;
}
