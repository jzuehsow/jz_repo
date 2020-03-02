






$noMembers = @()
$dynamic = @()
$noEmail = @()
$archived = @()
$orphaned = @()
$allInactive = @()

$i = 0
$distros = (Get-ADGroup -Filter * -Properties GroupCategory,mail,ManagedBy,Members) | ? {$_.GroupCategory -ne "Security"}
$total = $distros.Count
ForEach ($distro in $distros)
{
    Remove-Variable distroname,rm* -Force
    $i++; $finding = $true; $rmAllDisabled = $true
    $distroName = $distro.Name
    $rmManager = $distro.ManagedBy
    $rmMems = $distro.Members
    $rmMembers = Get-ADGroupMember $distro -Recursive
    
    If ($rmMembers.Count -eq 0)
    {
        If ($rmMems.Count -eq 0) {$noMembers += $distroName}
        Else {$dynamic += $distroName}
    }
    ElseIf (!$distro.mail) {$noEmail += $distroName}
    ElseIf ($distro.DistinguishedName -like "*Archive*") {$archived += $distroName}
    ElseIf ($distro.DistinguishedName -like "*ORPHAN*") {$orphaned += $distroName}
    <#ElseIf ($rmMembers.Count -eq 1)
    {
        $rmManager = (Get-ADUser $distro.ManagedBy).SamAccountName
        $rmMembers = (Get-ADGroupMember $distro).SamAccountName
        If ($rmManager -eq $rmMembers) {$mgrOnly += $distroName}
    }#>
    Else
    {
        ForEach ($rmMember in $rmMembers) {If ((Get-ADUser $rmMember -Properties Enabled).Enabled) {$finding = $false; Break}}
        If ($finding) {$allInactive += $distroName}
    }

    If ($finding)
    {
        $finding = $false; Clear-Host
        $memCount = $noMembers.Count; $dynamicCount = $dynamic.Count; $mailCount = $noEmail.Count; $archiveCount = $archived.Count; $orphanCount = $orphaned.Count; $mgrOnlyCount = $mgrOnly.Count; $allInactiveCount = $allInactive.Count
        Write-Host "Checking $i of $total`nNoMembers = $memCount`nDynamic = $dynamicCount`nNo Email = $mailCount`nArchive OU = $archiveCount`nOrphaned OU = $orphanCount`nMGR Only = $mgrOnlyCount`nAll Inactive = $allInactiveCount"
    }

}

$noMembers | Add-Content 'no_members.csv'
$dynamic | Add-Content 'dynamic.csv'
$noEmail | Add-Content 'no_email.csv'
$archived | Add-Content 'archived.csv'
$orphaned | Add-Content 'orgphaned.csv'
$allInactive | Add-Content 'inactive_users.csv'