




$pshost = get-host;$pswindow = $pshost.UI.RawUI;$newsize = $pswindow.BufferSize;$newsize.Height = 65;$newsize.Width = 120;$pswindow.BufferSize = $newsize
$pdc = (Get-ADDomain | Select-Object PDCEmulator).PDCEmulator;$PSDefaultParameterValues = @{"*-AD*:Server"="$pdc"}

$wid=[System.Security.Principal.WindowsIdentity]::GetCurrent();$prp=new-object System.Security.Principal.WindowsPrincipal($wid)
$adm=[System.Security.Principal.WindowsBuiltInRole]::Administrator;$isadm = $prp.IsInRole($adm)

$rmAdm = $env:username
$rmSvr = $env:COMPUTERNAME

$exchSvrs = (Get-ADComputer -Filter {Name -like "[EXCHANGE SERVER HINT]-*"}).Name
Foreach ($exchSvr in $exchSvrs)
{
    If (Test-Connection $exchSvr -Count 2)
    {
        $session = New-PSSession -ConfigurationName Microsoft.Exchange -ConnectionUri http://$exchSvr.[DOMAIN]/Powershell/
        Import-PSSession $session -DisableNameChecking -AllowClobber -Verbose:$false > $null       
        If (Get-Command Get-Mailbox) {Break}
    }
}
If (!(Get-Command Get-Mailbox)) {Write-Host "Connection to on prem exchange failed. Please try again." -F Red;Pause;Exit}

Get-MsolUser -HasErrorsOnly -All | ft DisplayName,UserPrincipalName,@{Name="Error";Expression={($_.errors[0].ErrorDetail.objecterrors.errorrecord.ErrorDescription)}} -AutoSize -wrap

Get-MsolUser -HasErrorsOnly -All | ft UserPrincipalName -AutoSize -wrap

Pause