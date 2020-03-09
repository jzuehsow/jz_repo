
#MAKE A DASHBOARD TO TRACK USER ACCOUNT
#



k$pshost = get-host
$pswindow = $pshost.UI.RawUI
$newsize = $pswindow.BufferSize
$newsize.Height = 5000
$newsize.Width = 235
$pswindow.BufferSize = $newsize
$pswindow.BackgroundColor = "DarkBlue"
Clear-Host

$lgsvr = $env:LOGONSERVER.TrimStart("\\");$PSDefaultParameterValues = @{"*-AD*:Server"="$lgsvr"}
$admin = $env:username;$tmpfile = Get-Date -format yyMMddHHmmss ; $tmpfile =  "C:\Users\$admin\AppData\Local\$tmpfile.txt"

##############################################################################################################################################################
#  Gets usernames                                              
##############################################################################################################################################################

$i = 0
New-Item $tmpfile -ItemType File > $null
If (!(Test-Path $tmpfile)){Write-Host "An error has occured. Try the script again." -F Red;Pause;Exit}
""
Write-Host "Press enter to launch notepad. Add each user to notepad, one user per line." -F Yellow
Write-Host "The script will continue once notepad is saved and closed. Select save, NOT save as." -F Yellow -NoNewline ; Read-Host " "
Invoke-Item $tmpfile

Do
{
    $users = Get-Content $tmpfile
    Start-Sleep $i; $i++
    If($i -ge 5) {Write-Host "An error has occurred." -F Red; Pause; Exit}
}
Until ($users)


While($true)
{
    If ($ii)
    {
        $percent = "{0:P0}" -f ($lgin/$total)
        $lgin = $null;$iii = $null
    }

    Clear-Host;$i = 0;$total = $null;
    Write-Host "Percentage of users who have logged in:  $percent" -F Green;"";""

    Foreach ($user in $users)
    {
        $loggedin = $null
        If ($user -like "??*")
        {
            If ($(try {Get-ADUser $user} catch {$null}))
            {
                $i++;$total++;If ($i -eq 83){$i = 0;Start-Sleep 5;Clear-Host;Write-Host "Percentage of users who have logged in:  $percent" -F Green;"";""}

                $usertest = get-aduser $user -Properties memberof,badPwdCount,LockedOut,PasswordLastSet,DisplayName
                $rmpwcount = $usertest.badPwdCount
            
                $rmcolor = "White";$rmrsanochallenge = "Yes";$rmlocked = "No"
                If ($usertest.badPwdCount -ge "3"){$rmcolor = "yellow"}
                If (!(get-aduser $user -properties memberof | where {$_.memberof -like "*WKS-RSA-NoChallenge-Perm*"})){$rmcolor = "Red";$rmrsanochallenge = "No"}   
                If ($usertest.LockedOut -eq "True"){$rmcolor = "Red";$rmlocked = "Yes"}
                If (!$rmpwcount){$rmpwcount = 0}
                If ($usertest.PasswordLastSet){$lgin++}

                $rmnumber = "$total.    ";$rmnumber = $rmnumber.Substring(0,4)
                $rmrsanochallenge = "$rmrsanochallenge ";$rmrsanochallenge = $rmrsanochallenge.Substring(0,3)
                $rmlocked = "$rmlocked ";$rmlocked = $rmlocked.Substring(0,3)
                $rmfullname =  $usertest.DisplayName;$rmfullname = "$rmfullname                                   ";$rmfullname = $rmfullname.Substring(0,35)
                $user = "$user                    ";$user = $user.Substring(0,20);$pwset = $usertest.PasswordLastSet

                Write-Host "  $rmnumber    Name:  $rmfullname    UserName:  $user    RSA-NoChallenge:  $rmrsanochallenge         AccountLocked:  $rmlocked         BadPasswordAttempts:  $rmpwcount    PasswordSet:   $pwset"  -F $rmcolor 
            }
            Else {Write-Host "$user not found in Active Directory" -F Red}
        }
    }   
    Start-Sleep 5
}