

<#

THESE ARE SOME NOTES FROM ORIGINAL SCRIPT

Write-Host "This application allows Security Group Managers to view, add, and removed members from their Managed Security Groups." -F cyan
Write-Host "Changes are immediate. Changes for Distribution Groups may take 24 - 48 hours to reflect in your Outlook Client" -F cyan
Write-Host "address book." -F cyan; ""
Write-Host "Note: You Must have permissions to UPDATE Membership List for the specific group you wish to modify." -F cyan; ""
Write-Host "To Exit thie Application, at any time, Hold the Ctrl Key and Press C" -F Yellow; ""; ""; ""
#>


Set-Location $PSScriptRoot
.".\Config\Common.ps1"
$version = '1.0'

Start_Script

#THIS FUNCTION NEEDS REVIEW
Function show-Menu
{
    param([string]$title = ' SECURITY GROUP MANAGER HOME MENU ')
    write-host "==========$title========="
    Write-host ""
    write-host "1: View my Managed Security Group(s)"
    write-host "2: ADD members to a Security Group I manage"
    write-host "3: Remove members from a Security Group I manage"
    write-host "4: Quit and Exit"
    Write-host " "
}

Function SG-LIST-GROUPS
{
    $ManagedGroups = Get-ADGroup -LDAPFilter "(ManagedBy=$((Get-aduser -Identity $env:USERNAME).distinguishedname))"
    If (!$ManagedGroups){write-host "You are not a manager of any Groups" -F Yellow ;pause;exit}
    Write-host "Retrieving Your List Of Managed Groups. This may take a moment:" -F Cyan; Write-Host " "

    $menu = @{}
    for ($i=1;$i -le $ManagedGroups.count; $i++) 
        {
        Write-Host "$i. $($ManagedGroups[$i-1].name)"
        $menu.Add($i,($ManagedGroups[$i-1].name))
        }
    
    Do
        {
        Write-Host " "; write-host "Press the number of the Group to View it's memebers:"  -F Yellow ; [int]$ans = Read-Host
        $selection = $menu.Item($ans); write-host " "
        If 
            (!$selection){Write-Host "Please choose a Group from list provided, type only the number to the left, and press Enter:" -F Red}
        }
    Until
        ($selection)


    Write-Host "The $selection Distribution Group has the following members:" -F Cyan; Write-Host " "
    $selectedManagedGroup = (get-adgroupmember $selection)
    

    $menu2 = @{}
    for ($i=1;$i -le $selectedManagedGroup.count; $i++) 
        {
        Write-Host "$i. $($selectedManagedGroup[$i-1].name)"
        $menu2.Add($i,($selectedManagedGroup[$i-1].name))
        }

        Write-Host " "; Write-Host "Returning to Home Menu..." -F Cyan; Write-Host " "
}


Function DG-Member-ADD
    {
    $ManagedGroups = Get-ADGroup -LDAPFilter "(ManagedBy=$((Get-aduser -Identity $env:USERNAME).distinguishedname))"
    If (!$ManagedGroups){write-host "You are not a manager of any Groups" -F Yellow ;pause;exit}
    
    Write-host "Retrieving Your List Of Managed Groups. This may take a moment:" -F Cyan; Write-Host " "

    $menu = @{}
    for ($i=1;$i -le $ManagedGroups.count; $i++) 
        {
        Write-Host "$i. $($ManagedGroups[$i-1].name)"
        $menu.Add($i,($ManagedGroups[$i-1].name))
        }



    Do
        {
        Write-Host " "; write-host "Please choose the group you would like to ADD a member to, and press Enter:" -F Yellow; [int]$ans = Read-Host
        $selection = $menu.Item($ans); write-host " "
        If 
            (!$selection){Write-Host "Please choose a Group from list provided, type only the number to the left, and press Enter:" -F Red}
        }
    Until
        ($selection)



    Write-Host "The $selection Distribution Group has the following members:" -F Cyan; Write-Host " "
    $selectedManagedGroup = (get-adgroupmember $selection)
    $menu2 = @{}
    for ($i=1;$i -le $selectedManagedGroup.count; $i++) 
        {
        Write-Host "$i. $($selectedManagedGroup[$i-1].name)"
        $menu2.Add($i,($selectedManagedGroup[$i-1].name))
        }


    Do
    {
    write-host " "; write-host "Type the email address of the new member, and press Enter:" -F Yellow;
    $usermail2 = read-host
    $mailcheck = get-aduser -filter {mail -eq $usermail2}
    If (!$mailcheck){write-host "The email address entered is not associated with a user acount." -F Red; write-host " "}
    }Until ($mailcheck)    ;"";""

    $useradd = (get-aduser -filter {EmailAddress -like $usermail2}).samaccountname
    #$useradd_Display
    Write-Host " "


    add-ADGroupMember -Identity $selection -Members $useradd
    $useradddisplay = (get-aduser $useradd -Properties displayname).displayname; Write-host "Memeber $useradddisplay has been added to Group $Selection" -F Cyan; write-host " "
    #Write-Host "Providing updated list of users in memebers in Distribution froup $selection" -F Yellow; " "
    }



Function DG-Member-Remove

    {
    $ManagedGroups = Get-ADGroup -LDAPFilter "(ManagedBy=$((Get-aduser -Identity $env:USERNAME).distinguishedname))"
    If (!$ManagedGroups){write-host "You are not a manager of any Groups" -F Yellow ;pause;exit}
    
    Write-host "Retrieving Your List Of Managed Groups. This may take a moment:" -F Cyan; Write-Host " "

    $menu = @{}
    for ($i=1;$i -le $ManagedGroups.count; $i++) 
        {
        Write-Host "$i. $($ManagedGroups[$i-1].name)"
        $menu.Add($i,($ManagedGroups[$i-1].name))
        }

    Do
        {
        Write-Host " "; write-host "Type the number of the Group you wish to modify, and press Enter:" -F Yellow; [int]$ans = Read-Host
        $selection = $menu.Item($ans); Write-Host " "
        If 
            (!$selection){Write-Host "Please choose a Group from list provided, type only the number to the left, and press Enter:" -F Red}
        }
    Until
        ($selection)

        
    Write-Host "Listing Members of Distribution Group $selection" -F Yellow; write-host " "
  
    $selectedManagedGroup = (get-adgroupmember $selection)
    $menu2 = @{}
    for ($i=1;$i -le $selectedManagedGroup.count; $i++) 
        {
        Write-Host "$i. $($selectedManagedGroup[$i-1].name)"
        $menu2.Add($i,($selectedManagedGroup[$i-1].name))
        }

                
       Do
        {
        Write-Host " "; write-host "Type the number of the Group you wish to modify, and press Enter:" -F Yellow; [int]$ans2 = Read-Host
        $selection2 = $menu2.Item($ans2); Write-Host " "
        If 
            (!$selection2){Write-Host "Please choose a User from list provided, type only the number to the left, and press Enter:" -F Red}
        }
    Until
        ($selection2)



        $userrmove = (get-aduser -filter {name -eq $selection2}).samaccountname
        Remove-ADGroupMember -Identity $selection -Members $userrmove
        Write-host "$selection2 has been removed from $Selection" -F Cyan; write-Host " "
        #Write-Host "Providing updated list of users in memebers in Distribution froup $selection" -F Cyan
    }




do
    {
    Show-Menu
    Write-Host "Please Make a Selection, and press Enter:" -F Yellow
    $prompt = Read-Host 
    Write-Host " "
    switch ($prompt)
        {
        '1'{SG-LIST-GROUPS}
        '2'{DG-Member-ADD}
        '3'{DG-Member-Remove}
        '4'{eXIT}
        }
  }
    until ($input -eq '3')