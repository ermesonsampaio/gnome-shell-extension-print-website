const { GObject, St, Gtk, GLib, Gio, Notify } = imports.gi;

const Gettext = imports.gettext;

const Main = imports.ui.main;
const MessageTray = imports.ui.messageTray;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Domain = Gettext.domain('print-website-indicator');

const _ = Domain.gettext;

const Prefs = Me.imports.prefs;

const IndicatorName = 'PrintWebsiteIndicator';

const Indicator = GObject.registerClass(
  class Indicator extends PanelMenu.Button {
    _init() {
      super._init(1, IndicatorName);

      this.add_child(
        new St.Icon({
          icon_name: 'emblem-photos-symbolic',
          style_class: 'icon',
        })
      );
      
      this._loadSettings();
      this._buildMenu();
    }

    _buildMenu() {
      const _entryItem = new PopupMenu.PopupBaseMenuItem({
        reactive: false,
        can_focus: false
      });
  
      this.searchEntry = new St.Entry({
        name: 'searchEntry',
        style_class: 'search-entry',
        can_focus: true,
        hint_text: _('Url from site...'),
        track_hover: true,
        x_expand: true,
        y_expand: true,
      });
  
      this.searchEntry.get_clutter_text().connect('text-changed', this._onTextChanged.bind(this));
      
      _entryItem.add(this.searchEntry);
      this.menu.addMenuItem(_entryItem);
  
      this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
  
      const button = new PopupMenu.PopupImageMenuItem(_('Screenshot'), 'document-save-symbolic');
      this.menu.addMenuItem(button);
  
      button.connect('activate', this._saveFile.bind(this));
  
      this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
  
      const settings = new PopupMenu.PopupImageMenuItem(_('Settings'), 'emblem-system-symbolic');
      this.menu.addMenuItem(settings);
  
      settings.connect('activate', this._openSettings.bind(this));

      const createApiKey = new PopupMenu.PopupImageMenuItem(_('Create API key'), 'dialog-password-symbolic');
      this.menu.addMenuItem(createApiKey);
  
      createApiKey.connect('activate', this._createApiKey.bind(this));
    }

    _onTextChanged() {
      this.url = this.searchEntry.get_text();
    }

    _saveFile() {
      if(this.API_KEY.length > 0) {
        if(this.url.length > 0) {
          const downloadsDir = GLib.get_user_special_dir(2);
          const fileName = `Print Website from ${this._formatDate()}`;
    
          if (!this.url.startsWith('https://')) {
            this._notify(
              _('Download not initialized!'),
              _('Enter a valid URL.'),
              'dialog-error-symbolic',
            );
            return;
          }
    
          function searchContent(search) {
            return 'RESULT=`echo "$FILE_CONTENT" | grep ' + `"${search}"` + '`';
          }

          const FILE_CONTENT = 'FILE_CONTENT=`cat ' + this.url.split('://', 2)[1] + '`';
          const FILE_CONTENT_LENGTH = 'FILE_CONTENT_LENGTH=${#FILE_CONTENT}';
          const script = `
            cd ${downloadsDir}
    
            BASE_URL="https://screenshot.abstractapi.com/v1/"
            PARAMETERS="?api_key=${this.API_KEY}&url=${this.url}"
            URL=$BASE_URL$PARAMETERS
            
            curl $URL -O
            
            if [ -f "${this.url.split('://', 2)[1]}" ]
            then
              ${FILE_CONTENT}
              ${FILE_CONTENT_LENGTH}

              if [ "$FILE_CONTENT_LENGTH" -eq "0" ]
              then
                notify-send "${_('Download successful!')}" "${_(`The print has been saved in ${downloadsDir}.`)}" -i "document-save-symbolic" -a "Print Website"
                mv "${this.url.split('://', 2)[1]}" "${fileName}"
              else
                ${searchContent('Invalid API key provided')}
                if [ "$RESULT" ]
                then
                  notify-send "${_('Error on download!')}" "${_('Set a valid API key in Settings of this extension.')}" -i "dialog-error-symbolic" -a "Print Website"
                  rm "${this.url.split('://', 2)[1]}"
                else
                  ${searchContent('Enter a valid URL.')}
                  if [ "$RESULT" ]
                  then
                    notify-send "${_('Error on download!')}" "${_('Enter a valid URL.')}" -i "dialog-error-symbolic" -a "Print Website"
                    rm "${this.url.split('://', 2)[1]}"
                  else
                    notify-send "${_('Error on download!')}" "" -i "dialog-error-symbolic" -a "Print Website"
                    rm "${this.url.split('://', 2)[1]}"
                  fi
                fi
              fi
            fi
          `;
    
          try {
            const process = Gio.Subprocess.new(
              ['bash', '-c', script],
              (Gio.SubprocessFlags.STDIN_PIPE | Gio.SubprocessFlags.STDOUT_PIPE),
            );
    
            process.wait_async(null, (process, res) => {
              try {
                process.wait_finish(res);
              } catch (err) {
                this._notify(_('Error on download'), 'dialog-error-symbolic', err);
              }
            });
          } catch (err) {
            this._notify(_('Error on download'), 'dialog-error-symbolic', err);
          }
        }
      } else {
        this._notify(
          _('Download not initialized!'),
          _('Set a valid API key in Settings of this extension.'),
          'dialog-error-symbolic'
        );
      }
    }

    _initNotifySource(icon) {
      this._notifySource = new MessageTray.Source('Printe Website', icon);

      this._notifySource.connect('destroy', () => this._notifySource = null);

      Main.messageTray.add(this._notifySource);
    }

    _notify(summary, body, icon) {
      this._initNotifySource(icon);

      const notification = new MessageTray.Notification(this._notifySource, summary, body);
      notification.setTransient(true);

      this._notifySource.showNotification(notification);

      this._notifySource = null;
    }

    _formatDate() {
      const date = new Date();
  
      return `${date.getFullYear()}-${date.getMonth()}-${date.getDay()} ${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}`
    }

    _openSettings() {
      ExtensionUtils.openPrefs();
    }

    _loadSettings() {
      this._settings = Prefs.SettingsSchema;
      
      this._settingsChangedId = this._settings.connect('changed', this._onSettingsChange.bind(this));
  
      this._fetchSettings();
    }

    _fetchSettings() {
      this.API_KEY = this._settings.get_string(Prefs.Fields.API_KEY);
    }

    _onSettingsChange() {
      this._fetchSettings();
    }

    _createApiKey() {
      Gtk.show_uri(null, 'https://app.abstractapi.com/users/signup', Gtk.get_current_event_time());
    }
  }
);

class Extension {
  constructor(uuid) {
    this._uuid = uuid;

    Gettext.bindtextdomain('print-website-indicator', Me.dir.get_child('locale').get_path());
    Gettext.textdomain('print-website-indicator');
  }

  enable() {
    this._indicator = new Indicator();
    Main.panel.addToStatusArea(this._uuid, this._indicator);
  }

  disable() {
    this._indicator.destroy();
    this._indicator = null;
  }
}

function init(meta) {
  return new Extension(meta.uuid);
}
