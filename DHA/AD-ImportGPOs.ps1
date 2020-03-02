



<###################################################################################
Required information before executing:

    - Root folder path for GPOs to be imported. 
    
Execution:
    Import-GPOs_<version>.ps1 <GPO_Root_Folder_Path>


This script will perform the following actions:

    - Prompt user to select which GPOs to import as defined in 'Input Menu Function'.
    - Lists GPOs chosen by user that will be imported and requests confirmation of import operation.
    - Imports GPOs chosen by user that are located in user defined input path.
        - Links the appropriate WMI filter to the imported GPO.
        - Removes 'Authenticated Users' from the imported GPO security filter.
        - Grants 'Authenticated Users' Read rights to the imported GPO.
        - Configures GPO Security Filtering
    

v1.0 Created by Theron Howton, MCS
    01/16/2019

Modified:
v1.1 - Added code to create security filtering groups if they don't exist.

v1.2 - Added code to check for OUs and create if they don't exist.

v1.3 - Corrected issue with importing Office policies.

v1.4 - Modified various areas to allow functionality in APPS forest.

v1.5 - Added step to grant AGPM service account rights to the newly created GPOs.

v1.6 - Added code to fix errors when running script on a domain without AGPM.

v1.7 - Added check for AGPM account type.
    
#########################################################>


param (
 [Parameter(Mandatory=$True)][string]$GPO_Root_Folder_Path
)

# Global Variables
$gpoFolder = $GPO_Root_Folder_Path
$dInfo = Get-ADDomain
$dn = $dInfo.distinguishedname
$nbN = $dInfo.NetBIOSName
$dName = $dInfo.DNSRoot
$pdcE = $dInfo.pdcemulator
$eOU = "OU=$nbn,$dn"
$desc = "Used for security filtering new DISA STIG GPOs during testing phase."



# Get WMI filters
$filters = Get-ADObject -Filter 'objectClass -eq "msWMI-Som"' -Properties "msWMI-Name","msWMI-Parm1","msWMI-Parm2" -Server $pdcE

# Used for Server 2016 STIGs
$ws2016 = "Windows Server 2016"

# Used for Office 2016 STIGs
$o2016 = "*2016 STIG*"

# Used for WMI filters
$dc = "Windows Server 2016 Domain Controller"
$ms = "Windows Server 2016 Member Server"
$wmiO2016 = "Microsoft Office 2016"

# Used for Security Filtering
$usr = "*User*"
$cmp = "*Computer*"

# Get SecurityFilters OU info.
$ou = ""
$ou = (Get-ADOrganizationalUnit -LDAPFilter '(name=Security Filter Groups)' -SearchBase $dn -Server $pdcE).DistinguishedName

# Get AGPM service account
try {$agpmSVC = (gwmi -ComputerName agpm.$dname win32_service -ErrorAction SilentlyContinue | Where-Object {$_.name -eq "AGPM Service"}).startname}
Catch {}

# Determine AGPM service account Type.
if ($agpmSVC){
    $agpmSVC = $agpmSVC.Split('\')[1]
    try {$agpmTypeCheck = Get-ADServiceAccount -Identity $agpmSVC -ErrorAction SilentlyContinue} Catch{}
    if($agpmTypeCheck.ObjectClass -eq 'msDS-GroupManagedServiceAccount'){
        $agpmType = 'Computer'
    }
    try {$agpmTypeCheck = Get-ADUser -Identity $agpmSVC -ErrorAction SilentlyContinue} Catch{}
    if($agpmTypeCheck.ObjectClass -eq 'User'){
        $agpmType = 'User'
    }
}

# Looks for specific security groups and creates them if they don't exist.
If ($ou -ne $null){

    Try {(Get-ADGroup -Identity "SecFltr-USR-OptInSTIG-Temp" -Server $pdcE).name | Out-Null}
    Catch {New-ADGroup -Name “SecFltr-USR-OptInSTIG-Temp” -GroupScope Global -Description $desc  -Path $ou -Server $pdcE | Out-Null}

    Try {(Get-ADGroup -Identity "SecFltr-USR-OptInSTIG-Perm" -Server $pdcE).name | Out-Null}
    Catch {New-ADGroup -Name “SecFltr-USR-OptInSTIG-Perm” -GroupScope Global -Description $desc -Path $ou -Server $pdcE | Out-Null}

    Try {(Get-ADGroup -Identity "SecFltr-CMP-OptInSTIG-Temp" -Server $pdcE).name | Out-Null}
    Catch {New-ADGroup -Name “SecFltr-CMP-OptInSTIG-Temp” -GroupScope Global -Description $desc -Path $ou -Server $pdcE | Out-Null}
        
    Try {(Get-ADGroup -Identity "SecFltr-CMP-OptInSTIG-Perm" -Server $pdcE).name | Out-Null}
    Catch {New-ADGroup -Name “SecFltr-CMP-OptInSTIG-Perm” -GroupScope Global -Description $desc -Path $ou -Server $pdcE | Out-Null}

# Security groups for filtering
    $secFltrU = ""
    $secFltrC = ""
    $secFltrU = (Get-ADGroup -Filter 'Name -like "SecFltr-USR-OptInSTIG*"' -Server $pdcE).name
    $secFltrC = (Get-ADGroup -Filter 'Name -like "SecFltr-CMP-OptInSTIG*"' -Server $pdcE).name
   }


If (Test-Path "$gpoFolder"){

    $gpo = ""
      If (!($gpo = (get-childitem $gpoFolder -Recurse | Where-Object {$_.Name -eq "gpreport.xml"}).FullName)){
            Write-Host "`nUnable to locate GPOs in '$gpoFolder'. Please provide a valid path for the GPOs you wish to import." -ForegroundColor Red `n
           }

        Else{
#########################################################

  $selection = "" 
   # Input Menu Function 
    function Show-Menu
        {
            param (
                [string]$Title = 'GPO Import Menu'
            )
            #Clear-Host
            Write-Host "`n================ $Title ================`n" -ForegroundColor Cyan
            Write-Host "Options:" -ForegroundColor Cyan `n
            
            Write-Host "1: Windows Server 2016"
            Write-Host "2: Windows 10"
            Write-Host "3: Internet Explorer 11"
            Write-Host "4: Office 2016 Suite"
            Write-Host "Q: Quit`n" -ForegroundColor Red
          
           }

    Show-Menu –Title 'GPO Import Menu'
         $selection = Read-Host "Enter option # corresponding to the GPOs you wish to import" 
         switch ($selection){
         '1' {
             'You chose option #1'
         } '2' {
             'You chose option #2'
         } '3' {
             'You chose option #3'
         } '4' {
             'You chose option #4'
         } 'Q' {
             Write-Host "Script halted. No changes made to the environment." -ForegroundColor Red `n
             return
         }
         Default {Write-Host "`nYou did not enter a valid selection. Please try again" -ForegroundColor Red `n ;
                  return}
        }
 
     $app = ""
     If($selection -eq "1"){$app = "Windows Server 2016"}
     If($selection -eq "2"){$app = "Windows 10"}
     If($selection -eq "3"){$app = "Internet Explorer 11"}
     If($selection -eq "4"){$app = "2016 STIG"}
           
#########################################################

    # Set WMI Filter Function
     function Set-GPOWmiFilter
                                                                                                                                                                                                                                                                                                                                                                                                        {
        <#
        ----------------------------------------
        Version: 1.0.6.0
        Author: Tore Groneng
        -----------------------------------------
        #>
        [cmdletbinding()]
        Param(
            [Parameter(
                ValueFromPipeline,
                ParameterSetName='ByWMIFilterObject')]
            [Microsoft.GroupPolicy.WmiFilter]$WMIfilter
            ,
            [Parameter(ParameterSetName='ByWMIFilterName')]
            [Parameter(ParameterSetName='FilterByPolicyName')]
            [Parameter(ParameterSetName='FilterByPolicyGUID')]
            [string]$WMIFilterName
            ,
    
            [Parameter(ParameterSetName='FilterByPolicyName')]
            [Parameter(ParameterSetName='ByWMIFilterObject')]
            [string]$GroupPolicyName
            ,
    
            [Parameter(ParameterSetName='FilterByPolicyGUID')]
            [Parameter(ParameterSetName='ByWMIFilterObject')]
            [guid]$GroupPolicyGUID
        )
        BEGIN
        {
            $f = $MyInvocation.InvocationName
            Write-Verbose -Message "$f - START"

            Write-Verbose -Message "$f - Loading required module GroupPolicy"

            if(-not (Get-Module -Name GroupPolicy))
            {
                Import-Module -Name GroupPolicy -ErrorAction Stop -Verbose:$false
            }
            $GPdomain = New-Object Microsoft.GroupPolicy.GPDomain
            $SearchFilter = New-Object Microsoft.GroupPolicy.GPSearchCriteria

            Write-Verbose -Message "$f - Searching for WmiFilters"
            $allWmiFilters = $GPdomain.SearchWmiFilters($SearchFilter)
        }

        PROCESS
        {    
            if($WMIFilterName)
            {
                Write-Verbose -Message "$f - Finding WMI-filter with name $WMIFilterName"
                $WMIfilter = $allWmiFilters | Where-Object Name -eq $WMIFilterName
                if(-not $WMIfilter)
                {
                    $msg = "Did not find a WMIfilter with name '$WMIFilterName'"
                    Write-Verbose -Message "$f - ERROR - $msg"
                    Write-Error -Message $msg -ErrorAction Stop
                }
            }

            $GroupPolicyObject = $null

            if($GroupPolicyName)
            {
                Write-Verbose -Message "$f - Finding Group Policy with name '$GroupPolicyName'"
                $GroupPolicyObject = Get-GPO -Name $GroupPolicyName
                if(-not $GroupPolicyObject)
                {
                    $msg = "Unable to find GPO with Name '$GroupPolicyName'"
                    Write-Verbose -Message "$f - ERROR - $msg"
                    Write-Error -Message $msg -ErrorAction Stop
                }
            }

            if($GroupPolicyGUID)
            {
                Write-Verbose -Message "$f - Finding Group Policy with GUID '$GroupPolicyGUID'"
                $GroupPolicyObject = Get-GPO -Guid $GroupPolicyGUID
                if(-not $GroupPolicyObject)
                {
                    $msg = "Unable to find GPO with GUID '$GroupPolicyGUID'"
                    Write-Verbose -Message "$f - ERROR - $msg"
                    Write-Error -Message $msg -ErrorAction Stop
                }
            }

            Write-Verbose -Message "$f - Applying filter with name '$($WMIfilter.Name)' to GPO '$($GroupPolicyObject.DisplayName)'"

            try
            {
                $GroupPolicyObject.WmiFilter = $WMIfilter
            }
            catch
            {
                $ex = $_.Exception
                Write-Verbose -Message "$f - EXCEPTION - $($ex.Message)"
                throw $ex
            }
        }

        END
        {
            Write-Verbose -Message "$f - END"
        }
        }

#########################################################
    #Import GPOs 
      
                    
         # Parse all GPO backup files in user provided path
            $arr1 = @() # Array of all GPOs in input folder path.
            Foreach ($i in $gpo){
                                     
                    [xml]$gpname = get-content $i
                    $gpoI = $gpname.GPO.Name
                    
                    $arr1 += $gpoi}
 
           $arr2 =@() # User defined array from input menu
           foreach($o in $arr1 -like "*$app*"){$arr2 += $o}

           Write-Host "`nThe following GPOs will be imported into '$dname' :`n" -ForegroundColor cyan
             $arr2+"`n"
                                             
            $ask = ""
            While ($ask -notmatch "[Y|N]"){
                $ask = Read-Host "Do you want to continue? (Y/N)"
                }
               
               If ($ask -eq "Y"){

                    $choices = [System.Management.Automation.Host.ChoiceDescription[]] @("&Yes","&No")
                    While ( $true ) {
                      $err = ""
                       If ($app -eq "2016 STIG") {$app = "Office System 2016"}
                       
                       foreach ($obj in $gpo -like "*$app*"){

                            $path = Split-Path $obj -Parent | Split-Path -Parent
                            $backupID = Split-Path (Split-Path $obj -Parent) -Leaf
                            [xml]$gpname = get-content $obj
                            $gpoI = $gpname.GPO.Name
                            $filter = ""
                            $filterName = ""
                        
                            # Import GPOs
                              Import-GPO -BackupId $backupID -TargetName $gpoI -Path $path -Server $pdcE -CreateIfNeeded 
                                                      
                            # Remove 'Authenticated Users' from GPO security filter/grant Read permission
                              $gp = Get-GPO -Name $gpoI
                              $importedGPO = $gp.DisplayName
                              $importedGPO | Set-GPPermissions -Replace -PermissionLevel GPORead -TargetName 'Authenticated Users' -TargetType Group -Server $pdcE | Out-Null
                                                          
                            # Grant AGPM service account permissions to new GPO
                              If($agpmSVC){
                                $importedGPO | Set-GPPermission -PermissionLevel GpoEditDeleteModifySecurity -TargetName $agpmSVC -TargetType $agpmType -Server $pdcE | Out-Null
                                }
                            
                            # Configure security filtering
                              $secFltr = ""
                              ForEach ($secFltr in $secFltrU){
                                  If ($importedGPO -like $usr){
                                    $importedGPO | Set-GPPermission -Replace -PermissionLevel GpoApply -TargetName $secFltr -TargetType Group -Server $pdcE | Out-Null}
                                    }
                          
                              $secFltr = ""
                              ForEach ($secFltr in $secFltrC){
                                    If ($importedGPO -like $cmp){
                                    $importedGPO | Set-GPPermission -Replace -PermissionLevel GpoApply -TargetName $secFltr -TargetType Group -Server $pdcE | Out-Null}
                                    }
                             
                           # Link 2016 WMI filters
                             If ($gpoi -like "*$ws2016*"){                            
                                    If ($gpoi -like "*$dc*"){
                                        If ($filter = $filters | Where msWMI-Name -Like "*$dc*"){
                                            $filterName = $filter.'msWMI-Name'
                                            Set-GPOWmiFilter -WMIFilterName $filterName -GroupPolicyName $gpoi
                                            Write-Host "WMI filter " -NoNewline; Write-Host "'$filterName'" -ForegroundColor Green -NoNewline;`
                                                    Write-Host " successfully linked to the " -NoNewline; Write-Host "'$gpoi'" -ForegroundColor Green -NoNewline; Write-Host " GPO."
                                                }
                              
                                        Else {$err += "`nWMI filter for $ws2016 $dc doesn't exist. '$obj' has not been filtered."}
                                        Write-Host ""
                                     }                        
                            
                                    Else {
                                        If ($filter = $filters | Where msWMI-Name -Like "*$ms*"){
                                        $filterName = $filter.'msWMI-Name'
                                        Set-GPOWmiFilter -WMIFilterName $filterName -GroupPolicyName $gpoi
                                        Write-Host "WMI filter " -NoNewline; Write-Host "'$filterName'" -ForegroundColor Green -NoNewline;`
                                                Write-Host " successfully linked to the " -NoNewline; Write-Host "'$gpoi'" -ForegroundColor Green -NoNewline; Write-Host " GPO."
                                            }
                                        Else {$err += "`nWMI filter for $ws2016 $ms doesn't exist. '$gpoi' has not been filtered."}
                                        Write-Host ""
                                    }
                                }
                             
                             
                             Else {
                             
                              # Link Office 2016 WMI filter
                                If ($gpoi -like $o2016){
                                    If ($filter = $filters | Where msWMI-Name -eq "$wmiO2016"){
                                    $filterName = $filter.'msWMI-Name'
                                    Set-GPOWmiFilter -WMIFilterName $filterName -GroupPolicyName $gpoi
                                    Write-Host "WMI filter " -NoNewline; Write-Host "'$filterName'" -ForegroundColor Green -NoNewline;`
                                            Write-Host " successfully linked to the " -NoNewline; Write-Host "'$gpoi'" -ForegroundColor Green -NoNewline; Write-Host " GPO."    
                                        }
                                    Else {$err += "`nWMI filter for $o2016 doesn't exist. '$gpoi' has not been filtered."}
                                    Write-Host ""
                                    }
                                    
                              # Link all other WMI filters      
                                Else {
                                   If ($filter = $filters | Where msWMI-Name -eq "$app"){
                                    $filterName = $filter.'msWMI-Name'
                                    Set-GPOWmiFilter -WMIFilterName $filterName -GroupPolicyName $gpoi
                                    Write-Host "WMI filter " -NoNewline; Write-Host "'$filterName'" -ForegroundColor Green -NoNewline;`
                                            Write-Host " successfully linked to the " -NoNewline; Write-Host "'$gpoi'" -ForegroundColor Green -NoNewline; Write-Host " GPO."    
                                        }
                                    Else {$err += "`nWMI filter for $app doesn't exist. '$gpoi' has not been filtered.`n"}
                                    Write-Host "" 
                                   }
                               }
                             }

          
                    If ( $choices -ne 0 ) {
                          Break
                        }
                   }
             
                  If($err){Write-host "GPO import completed with the following warnings:" -BackgroundColor Yellow -ForegroundColor Black
                            Write-Host "$err" -ForegroundColor Yellow}
                  Else {Write-Host "GPO import completed successfully." -BackgroundColor Green -ForegroundColor Black}
             
             }

            Else {write-host "`nScript halted. No changes made to the environment.`n" -ForegroundColor red}
          }
          }
         
          
                    
  
  Else {
    Write-Host "`n'$gpoFolder' does not exist. Ensure to provide a valid path for the GPOs you wish to import." -ForegroundColor Red `n
  }

       

