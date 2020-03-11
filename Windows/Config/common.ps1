
Function Start_Script
{
  Import-Module ActiveDirectory
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
  $Script:smtp = "[SMTP.DOMAIN.COM]" #PULL THIS FROM THE INI FILE
  $Script:ErrorActionPreference = 'SilentlyContinue'
  $Script:WarningPreference = 'SilentlyContinue'
}

Function Write_Banner
{
  $title = ($Script:MyInvocation.MyCommand).Name -replace ".ps1", "$version"
  $l = (120-$title.Length)/16
  $seperator = 1..80 | % {Write-Host '-' -NoNewline} #THIS IS NOT WORKING?????
  $seperator = '--------------------------------------------------------------------------------'
  Clear-Host
  Write-Host "`n$seperator`n$seperator`n`n" -F Cyan
  Do {Write-Host "`t" -NoNewLine; $l--}
  Until ($l -le 0)
  Write-Host $title -F Yellow
  Write-Host "`n`n$seperator`n$seperator`n`n`n`n`n" -F Cyan
}

Function Stop_Script
{
  If (Get-PSSession) {Remove-PSSession *}
  Pause; Exit
}

Function Test_RunAsAdmin
{
  If (!(New-Object System.Security.Principal.WindowsPrincipal([System.Security.Principal.WindowsIdentity]::GetCurrent())).IsInRole([System.Security.Principal.WindowsBuiltInRole]::Administrator))
  {
    Write-Host "`nPowerShell is not running as administrator :(" -F Red
    Write-Host "`nFor full functionality, please run as administrator.`n`n" -F Yellow
    $exit = Read-Host "Type 'EXIT' to exit the script or press enter to continue"
    If ($exit -eq 'EXIT') {Exit}
  }

  $account = Get-ADUser $env:USERNAME -Properties *
  If ($account.EmployeeNumber)
  {
    $Script:admin = $account
    $Script:adminSam = $admin.SamAccountName
    $script:adminEID = $admin.EmployeeNumber
  }
  Else {$adminEID = $account.EmployeeID}

  $Script:regAcct = Get-ADUser -Filter {EmployeeID -eq $adminEID} -Properties *
  $Script:regSam = $regAcct.SamAccountName
  $Script:regName = $regAcct.GivenName+" "+$regAcct.Surname
  $Script:regEmail = $regAcct.EmailAddress
  $Script:regHome = $regAcct.HomeDirectory
  $Script:regPhone = $regAcct.telephoneNumber
  $Script:regDept = $regAcct.Department
}

Function New_ExchangeSession
{
  $Script:exchSvrs = (Get-ADComputer -Filter {Name -like "[EXCHANGE SERVER NAME]" -and Enabled -eq $true}).Name
  ForEach ($exchSVR in $exchSvrs)
  {
    If (Test-Connection $exchSvr -Count 1)
    {
      $session = New-PSSession -ConfigurationName Microsoft.Exchange -ConnectionUri http://$exchSvr.$domain/PowerShell/
      Import-PSSession $session -DisableNameChecking -AllowClobber -Verbose:$false -ErrorAction Stop | Out-Null
      If (Get-Command Get-Mailbox)
      {
        Write-Host "`nConnect to Exchange Server: $exchSvr`n" -F Green
        Break
      }
    }
  }
  If (!(Get-Command Get-Mailbox))
  {
    Write-Host "Connection to Exchange failed. Please try again." -F Red
    Pause; Exit
  }
}

Function Get_Time
{
  $Script:time = Get-Date -Format HH:mm
}