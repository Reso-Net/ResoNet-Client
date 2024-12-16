# ⚠️ This app is very early in it's development and will likely crash/not function correctly ⚠️
If you do notice any issues please make an issue [here](https://github.com/LeCloutPanda/ResoNet-Client/issues).

# ResoNet-Client
ResoNet-Client is Electron based desktop app that provides an easy way to interact with the [Resonite](https://resonite.com) Api and its [SignalR](https://dotnet.microsoft.com/en-us/apps/aspnet/signalr) endpoints allowing the user to send/recieve messages, look users up, add/remove users and more.

## Example Config
```json
{
	"username": "",
	"password": "",
	"totp": "",
	"rememberMe": true
}
```
*TOTP is only needed if you use TOTP on the account*

# Main things I am focusing on
- [ ] Fix contacts and messages sections not scrolling/scaling correctly
- [ ] Fix menu tabs at top not playing nicely with rest of application
- [ ] Move message/contact handling code to it's own class
- [ ] Clean up message/contact handling code
- [ ] Clean css files up
- [ ] Add user searching
- [ ] Add user profile stuff
- [ ] Basically finish the Contacts tab entirely
