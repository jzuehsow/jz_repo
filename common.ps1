
Function Start_Script
{
  Import-Module ActiveDirectory
  Remove-Variable * -Force -ErrorAction SilentlyContinue
  $psHost = Get-Host
  $psWindow = $psHost.UI.RawUI
  $newSize = $psWindow.BufferSize
  $newSize.Height = 65
  $newSize.Width = 120
  $psWindow.BufferSize = $newSize
  $domain = Get-ADDomain
  $Script:enclave = $domain.NetBIOSName
  $Script:pdc = $domain.PDCEmulator
  $Script:domain = $domain.DNSRoot
  $Script:date = Get-Date -F yyyy-MM-dd
  $Script:year = Get-Date -F yyyy
  $Script:month = Get-Date -F MM
  $Script:monthFN = Get-Date -F MMMM
  $Script:day = Get-Date -F dd
  $Script:dayFN = Get-Date -F ddd
  $Script:smtp = "[SMTP.DOMAIN.COM]"
}
