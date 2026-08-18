Option Explicit

Dim shell, fso, pasta, comando

Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

pasta = fso.GetParentFolderName(WScript.ScriptFullName)
shell.CurrentDirectory = pasta

If Not fso.FolderExists(fso.BuildPath(pasta, "node_modules")) Then
  comando = "cmd.exe /c npm install && npm run dev"
Else
  comando = "cmd.exe /c npm run dev"
End If

' 0 = janela oculta; False = não bloquear este iniciador.
shell.Run comando, 0, False

' Aguarda o Vite começar a responder antes de abrir o navegador.
WScript.Sleep 2500
shell.Run "http://localhost:5190", 1, False
