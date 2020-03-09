

#Students should be added to a teacher or student group (other variations on student/teacher types may exist)
#Each of the above group should be added to a 'New Class Group'
#New Class group should be members of all standard local groups (users, redirection, homedir)
<#
Group Nesting should appear like the following

USER > STUDENT GROUP > NEW CLASS GROUP > LOCAL RESOURCE GROUPS (USERS/SHARE/ETC.)
#>
#REMOVED $I = 0 FROM FUNCTIONS; TRY SETTING VARIABLE FROM WITHIN START OF FUNCTION CHECKS



Set-Location $PSScriptRoot
.".\Config\Common.ps1"
$version = '2.0'

Start_Script

$csvPath = "[NEW CLASS CSV PATH]"
$logPath = "[NEW CLASS LOGS]"
$pdc = "[PRIMARY DOMAIN CONTROLLER AT CLASS LOCATION]" #THIS WILL OVERWRITE PDC FROM START_SCRIPT
$passSuggestion = "NewStudent#$year"
$studentGroup = "[STUDENT GROUP]"
$instructorGroup = "[TEACHER GROUP]"
$newClassGroup = "[TRAINING SITE USERS GROUP]"
$redirGroup = "[TRAINING SITE REDIRECTION GROUP]" #THIS IS TO REDIRECT USERS TO THE LOCAL SHARE DRIVE FOR COURSE MATERIALS
$newClassOffice = "[NEW USERS CLASS]" #WHILE STUDENTS ARE IN CLASS THEY ARE PART OF THIS OFFICE
$newClassOU = "[LOCAL OU WHERE ALL STUDENTS IN TRAINING ARE KEPT]"
$newClassHomeDir = "[NEW STUDENT DIRECTORY]" #ALL NEW STUDENT DIRECTORIES TO BE KEPT IN THIS FOLDER

Function Add_ClassGroup
{
    If ($rmType -eq 'Student') {$classGroup = $studentGroup}
    If ($rmType -eq 'Instructor') {$classGroup = $instructorGroup}
    
    Do
    {
        Add-ADGroupMember $classGroup -Members $rmUser -Server $pdc
        Start-Sleep $i; $i++; If ($i -ge '5') {Break}
    }
    Until ((Get-ADPrincipalGroupMembership $rmUser -Server $pdc).Name -contains $classGroup)
}

Function Set_Office
{
    Do
    {
        Set-ADUser $rmUser -Office $newClassOffice -Server $pdc
        Start-Sleep $i; $i++; If ($i -ge '5') {Break}
    }
    Until ((Get-ADPrincipalGroupMembership $rmUser -Server $pdc).Name -contains $classGroup)
}

Function Move_OU
{
    Do
    {
        Move-ADObject $rmUser -TargetPath $newClassOU -Server $pdc
        Start-Sleep $i; $i++; If ($i -ge '5') {Break}
    }
    Until ((Get-ADUser $rmUser -Server $pdc).DistinguishedName -like "*$newClassOU*")

}

Function Move_HomeDir
{
    $rmHomeDir = $rmUser.HomeDirectory
    $rmNewHomeDir = "$newClassHomeDir\$rmSam"
    $rmSID = $rmUser.SID.Value
    $job = Get-Job -Command "Robocopy $rmHomeDir $rmNewHomeDir*"
    If ($job) {$Script:rmMoveHomeDir = $job.State.Substring(0,1); $Script:rmMoveHomeDirC = 'Yellow'}
    Else
    {
        Start-Job -ScriptBlock 
        {
            Robocopy $rmHomeDir $rmNewHomeDir /MIR /R:1 /W:1 /MT:2 /XD `$RECYCLE.BIN /LOG:"$logPath\Robo-$rmSam.txt"
            Do
            {
                Set-ADUser $rmUser -HomeDirectory $rmNewHomeDir
                Rename-Item $rmHomeDir -NewName "$rmHomeDir`_old"
                ICACLS $rmNewHomeDir /grant:r $rmSam`:'(OI)(CI)(F)'
                
                $pass = $true
                $rmUser = Get-ADuser $rmUser -Properties *
                If (!((Get-ADUser $rmUser -Properties *).HomeDirectory -eq $rmNewHomeDir)) {$pass = $false}
                If (!(Test-Path "$rmHomeDir`_old")) {$pass = $false}
                If (!((Get-Acl $rmNewHomeDir).AccessToString -like "*$rmSam Allow  FullControl*")) {$pass = $false}
                Start-Sleep $i; $i++; If ($i -ge '5') {Break}
            }
            Until ($pass)
        }
        $Script:rmMoveHomeDir = $job.State; $Script:rmMoveHomeDirC = 'Red'
    }
}

Do
{
    Remove-Variable rm* -Force
    $listCSVs = (Get-ChildItem $csvPath).Name | ? {$_ -like "*.csv"} | Sort
    $i = 0; $list = @()

    ForEach ($rmCSV in $listCSVs)
    {
        $i++; Write-Host "`t$i`t$rmCSV" -F Yellow
        New-Variable rmCSV$i -Value $rmCSV
    }
    $rmSelect = Read-Host "`nSelect CSV file to import [1-$i]"
    $csv = Get-Variable rmCSV$rmSelect -ValueOnly
    If ((Test-Path "$csvPath\$csv) -and ("$csvPath\$csv -ne "$csvPath\"))
    {
        $list = Import-Csv "$csvPath\$csv" | Sort SAM
        $total = $list.Count
        If ($total -eq 0) {Write-Host "$csv is empty." -F Red}
        Else {Write-Host "Importing $csv..." -F Green}
    }
}
Until ($list)

Do
{
    $input = Read-Host "`nDo you want to reset all passwords (Y/N)"

    If ($input -eq 'Y')
    {
        Do
        {
            $password = Read-Host "`nEnter new password (Example: $passSuggestion)"
            If ($password -eq 'Y') {$password = $passSuggestion}
        }
        Until ($password.Length -ge 8)
        $password = ConvertTo-SecureString $password -AsPlainText -Force

        $i = 0
        ForEach ($rmSam in $users.SamAccountName)
        {
            $i++; $percent = $i/$total*100
            Write-Progress -Activity "Resetting password $i of $total....." -PercentComplete $percent
            $rmUser = Get-ADUser $rmSam -Server $pdc

            If ($rmUser)
            {
                Reset_Password
                $rmPassLastSet = (Get-ADUser $rmSam -Properties * -Server $pdc).PasswordLastSet
                If (!$rmPassLastSet -or ($rmPassLastSet -le $startTime)) {$rmColor = 'Red'; $rmA = ' NOT'}
                Else {$rmColor = 'Green'}
                $rmStatus = "Password$rmA Changed"
            }
            Else {$rmColor = 'Red'; $rmStatus = 'ACCOUNT NOT FOUND'}

            $l = 5.5-$rmSam.Length/4
            Do {$rmSam += "`t"; $l--} Until ($l -lt 0)
            Write-Host "$i`t $rmSam $rmStatus" -F $rmColor
            Remove-Variable rm* -Force
        }
    }
}
Until ($input -eq 'Y' -or $input -eq 'N')

Write_Banner
If ((Read-Host "Press Enter to Continue or Type 'Q' to Quit") -eq 'Q') {Stop_Script}

Do {$useNoChallenge = Read-Host "`nAdd users to RSA No Challenge group (Y/N)"}
Until ($useNoChallenege -eq 'Y' -or $useNoChallenge -eq 'N')

Do {$addClassGroups = Read-Host "`nAdd users to class groups (Y/N)"}
Until ($addClassGroups -eq 'Y' -or $addClassGroups -eq 'N')

Do {$moveUserAcct = Read-Host "`nMove user object to training site (Y/N)"}
Until ($moveUserAcct –eq 'Y' -or $moveUserAcct –eq 'N')

Do {$moveHomeDir = Read-Host "`nMove user home directory to training site (Y/N)"}
Until ($moveHomeDir –eq 'Y' -or $moveHomeDir –eq 'N')

Do
{
    Get_Time; $startTime = Get-Date $time -Format F
    Write-Host "`nUse " -NoNewLine; Write-Host $startTime -F Green -NoNewLine; Read-Host " (Y/N)"
    If ($continue -eq 'N')
    {
        Do
        {
            $subtract = Read-Host "`nEnter hours to subtract from start time"
            $startTime = Get-Date (Get-Date.AddHours(-$subtract) -Format F)
        }
        Until ((Read-Host "`nIs $startTime correct (Y/N)") -eq 'Y')
    }
    Write-Host "`nStart time set to " -NoNewLine; Write-Host $startTime -F Green
}
Until ($startTime)

Write_Banner
ForEach ($user in $users)
{
    $rmSam = $user.SamAccountName
    $rmType = $user.Type
    $i++; $percent = $i/$total*100
    Write-Progress -Activity "Configuring user $i of $total....." -PercentComplete $percent

    If ($rmUser = Get-ADuser $rmSam -Properties * -Server $pdc)
    {
        Enable-ADAccount $rmUser -Server $pdc
        Unlock-ADAccount $rmUser -Server $pdc
        If ($useNoChallenge -eq 'Y') {Add_RSANoChallenge}
        If ($addClassGroups -eq 'Y') {Add_ClassGroup}
        If (moveUserAcct -eq 'Y') {Add_UserGroup; Add_RedirectionGroup; Set_Office; Move_OU}
        If ($moveHomeDir -eq 'Y') {If ($rmUser.HomeDirectory -notlike "$newClassHomeDir*") {Move_HomeDir}}
    }
}

Do
{
    Write_Banner
    $i = 0; $ok = 0

    ForEach ($user in $users)
    {
        $rmSam = $user.SamAccountName
        $rmType = $user.Type

        If (Get-ADUser $rmSam -Server $pdc)
        {
            $i++
            $rmUser = Get-ADUser $rmSam -Properties * -Server $pdc
            $rmBadPwd = $rmUser.badPwdCount
            $rmDN = $rmUser.DistinguishedName -replace "CN*,OU"
            $rmDN.Substring("OU=")
            $rmGroups = (Get-ADPrincipalGroupMembership $rmUser -Server $pdc).Name
            $rmColor = 'Green'
            $rmRSAExemptC = 'Green'
            $rmLockedC = 'Green'
            $rmBadPwdC = 'Green'
            $rmClassGroupC = 'Green'
            $rmMoveUserC = 'Green'
            $rmMoveHomeDirC = 'Green'

            If (!($rmUser.Enabled)) {Enable-ADAccount $rmUser -Server $pdc}
            
            If ($rmBadPwd -ge '1') {$rmColor = 'Yellow'}
            
            If ($rmUser.LockedOut)
            {
                Unlock_user
                If ((Get-ADUser $rmSam -Properties *).LockedOut) {$rmLocked = 'Y'; $rmColor = 'Red'}
                Else {$rmLocked = 'N'; $rmColor = 'Yellow'}
            }
            Else {$rmLocked = 'N'}

            If ($useNoChallenge -eq 'Y')
            {
                If ($rmGroups -notcontains $rsaNoChallenge)
                {
                    Add-RSANoChallenge
                    If ((Get-ADPrincipalGroupMembership $rmUser -Server $pdc).Name -notcontains $rsaNoChallenge) {$rmRSAExempt = 'N'; $rmRSAExemptC = 'Red'}
                    Else {$rmRSAExempt = 'Y'; $rmRSAExemptC = 'Yellow'}
                }
                Else {$rmRSAExempt = 'Y'}
            }

            If ($addNewClassGroups -eq 'Y')
            {
                If (($rmType -eq 'Student') -and ($rmGroups -notcontains $newClassGroup))
                {
                    Add_NewClassGroup
                    If ((Get-ADPrincipleGroupMembership $rmUser -Server $pdc).Name -notcontains $newClassGroup) {$rmNewClassGroup = 'N'; $rmNewClassGroupC = 'Red'}
                }
                ElseIf (($rmType -eq 'Instructor') -and ($rmGroups -notcontains $newClassGroup))
                {
                    Add_NewClassGroup
                    If ((Get-ADPrincipalGroupMembership $rmUser -Server $pdc).Name -notcontains $newClassGroup) {$rmNewClassGroup = 'N'; $rmNewClassGroupC = 'Red'}
                    Else {$rmNewClassGroup = 'Y'; $rmNewClassGroupC = 'Yellow'}
                }
                Else {$rmNewClassGroup = 'Y'}
            }

            If ($moveUserAcct -eq 'Y')
            {
                If ($rmGroups -notcontains $userGroup)
                {
                    Add_UserGroup
                    If ((Get-ADPrincipalGroupMembership $rmUser -Server $pdc).Name -notcontains $userGroup) {$rmMoveUser = 'N'; $rmMoveUserC = 'Red'}
                    Else {$rmMoveUser = 'Y'; $rmMoveUserC = 'Yellow'}
                }
                If ($rmGroups -notcontains $redirGroup)
                {
                    Add_RedirectionGroup
                    If (Get-ADPrincipalGroupMembership $rmUser -Server $pdc).Name -notcontains $redirGroup) {$rmMoveUser = 'N'; $rmMoveUserC = 'Red'}
                    Else {$rmMoveUser = 'Y'; $rmMoveUserC = 'Yellow'}
                }
                If ($rmUser.Office -notlike "*$newClassOffice*")
                {
                    Set_Office
                    If ((Get-ADUser $rmUser -Properties Office -Server $pdc).Office -notlike "*$newClassOffice") {$rmMoveUser = 'N'; $rmMoveUserC = 'Red'}
                    Else {$rmMoveUser = 'Y'; $rmMoveUserC = 'Yellow'}
                }
                If ($rmDN -notlike "*$newClassOU")
                {
                    Move_OU
                    If ((Get-ADUser $rmUser -Server $pdc).DistinguishedName -notlike "*$newClassOU") {$rmMoveUser = 'N'; $rmMoveUserC = 'Red'}
                    Else {$rmMoveUser = 'Y'; $rmMoveUserC = 'Yellow'}
                }
            }

            If ($moveHomeDir -eq 'Y')
            {
                $rmHomeDir = $rmUser.HomeDirectory
                $rmACL = (Get-Acl $rmHomeDir).AccessToString
                If (($rmHomeDir -notlike "$newClassHomeDir*") -and ($rmACL -notlike "*$rmSam Allow  FullControl*")) {Move_HomeDir}
            }
        }
        Until ((Get-Acl "$rmHomeDir\$rmSam").AccessToString -like "*$rmSam Allow  FullControl*")

        $rmLastLogon = $rmUser.LastLogondate
        $l = 5.5-$rmSam.Length/4
        Do {$rmSam += "`t"; $l--}
        Until ($l -lt 0)
        Write-Host "$i`t $rmSam " -NoNewline

		$rmLastLogon = $rmUser.LastLogondate
		$l = 5.5-$rmSam.Length/4
		Do {$rmSam += "`t"; $l--} Until ($l –lt 0)
		Write-Host "$I`t $rmSam " -NoNewLine
		
		If ($rmUser)
		{
			If ($rmLastLogonDate –ge $startTime)
			{
				$ok++
				Write-Host "logged in at: " -NoNewLine
				Write-Host $rmLastLogonDate –F $rmColor -NoNewLine
				Write-Host " ($ok / $I users logged in.)"
			}
			Else
			{
				Write-host "RSA-NoChallenge: $rmRSAExempt`t " -F $rmRSAExemptC -NoNewLine
				Write-host "AccountLocked: $rmLocked`t " -F $rmLockedC -NoNewLine
				Write-host "BadPwdAttempts: $rmBadPwd`t " -F $rmBadPwdC -NoNewLine
				Write-host "CitrixGroup: $rmBadPwd" -F $rmBadPwdC -NoNewLine
				Write-host "MoveUser: $rmMoveUser " -F $rmMoveUserC -NoNewLine
				Write-host "MoveHomeDir: $rmMoveHomeDir " -F $rmMoveHomeDirC
			}
		}
		Else {Write-Host "SAM NOT FOUND!!!!!" -F Red}
		Remove-Variable rm* -Force
    }
    Write-Host "$ok / $i users logged in."
    Start-Sleep 10
}
Until (($ok -eq $i) -and ($i -gt 0))

Write-Host "`nComplete!`n`n" -F Green
Stop_Script