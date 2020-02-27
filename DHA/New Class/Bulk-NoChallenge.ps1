



$csv = import-csv "[NEW CLASS CSV LIST]"

Foreach ($line in $csv)
{
$sam = $line.SamAccountName
$usr = get-aduser $sam
set-aduser $usr -replace @{Attribute1="RSA_PERM"}
set-aduser $usr -replace @{Attribute1Description="MFA Exempt"}
Add-ADGroupMember WKS-RSA-NoChallenge-Perm $usr}