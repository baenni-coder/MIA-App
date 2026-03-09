<?php
//Funktion
/*Dieses Skript liest den gesamten Kompetenzstufenaufbau des Lehrplans über die API-Schnittstelle https://api.lehrplan.ch ein und schreibt ihn in eine lokale Tabelle.
*/
//Handhabung
/* 
Aufruf mit https://yourdomain.org/import_lp21.php
Übergabevariablen wie folgt
 - db=truncate: leert die Tabelle vollständig (darf somit nur zu Beginn der einzeln ausgeführten Teilprozeduren gesetzt werden)
 - kanton=LU: liest nur den angegebenen Kanton ein (ohne diese Variable wird das ganze Array der in Zeile 145 angegebenen Kantone eingelesen). Die in der Tabelle vorhandenen Einträge des gewählten Kantons werden vorgängig automatisch gelöscht. Die Einlesezeit pro Kanton beträgt ca. 1100 Sekunden. Falls das Skript über einen Webaufruf geststartet wird, sollten die Kantone einzeln eingelesen werden, ansonsten ziemlich sicher ein Timeout des Servers erfolgt. Bei Konsolenstart kann das ganze Array der Kantone eingelesen werden, was dann aber zu einer Lauftzeit von gerne 3 Stunden führt.
*/
//Testanordung
/*
Das Skript ist testmässig unter https://lp21.fmzluzern.ch/ vorhanden.
*/

//Parameter API
$user_API='DeinUsername';
$password_API='DeinPasswort';

//Einzulesende Kantone bei Gesamtausführung
$allekantone=array('LU','UR','SZ','NW','OW','ZG','VS','V_EF','V_FE');
$z=0;


function lehrplanelement($kanton,$uid,$user_API,$password_API)
{
	
	global $tiefe;
	global $folge_in_zyklus;
	global $grundanspruch;
	global $orientierungspunkt;
	global $orientierungspunkt_vorher;
	global $spaeter_im_zyklus;
	global $folge_in_aufbaute;
	global $kstufencode;
	global $linie_oben;
	global $linie_unten;
	global $grau;
	global $anzahl_in_kompetenz;
	global $anzahl_in_zyklus;
	global $sprachreferenz_kurz;
	global $sprachreferenz;
	global $db;
	global $z;
	$z++;
	global $start;
	global $dieser_kanton;
	if($z%100==0){
echo "<br><b>Laufzeit: ".$dieser_kanton." ".sprintf('%.3f',microtime(true) - $start)." Sekunden ausgelesen (".$z." Lehrplanelemente)!</b>";
}
	//echo 'https://api.lehrplan.ch/getData.php?kanton='.$kanton.'&uid='.$uid.'&user='.$user_API.'&password='.$password_API;
	$daten = json_decode(file_get_contents('https://api.lehrplan.ch/getData.php?kanton='.$kanton.'&uid='.$uid.'&user='.$user_API.'&password='.$password_API),true);
	for($i=0;$i<$tiefe;$i++){echo "&nbsp;";}
	//hier beliebige Daten handeln (z.B. anzeigen, in eine DB einlesen, in eine Tabelle schreiben, etc.)
	
	
	echo "<br>".$z." ".$daten['lp21']['0']['bezeichnung']." ".$daten['lp21']['0']['uid']." ".str_replace("_","-",$daten['lp21']['0']['url']);
			
	//Ende Daten handeln
	
	
	$kind = $daten['lp21']['0']['hierarchie_unten'];
	$tiefe++;
	if(is_array($kind)){
		foreach($kind AS $kind_url){
		$kind_uid=explode("uid=",$kind_url);
		lehrplanelement($kanton,$kind_uid[1],$user_API,$password_API);
	}
	}
	$tiefe--;
}

//
if(!isset($_GET['uid'])){$_GET['uid']='00000000000000000000000000000000';}
echo "<h1>Ausgabe der Kindelemente ab UID ".$_GET['uid']."</h1>";
$start = microtime(true);
if(isset($_GET['kanton'])){
$kantone=array($_GET['kanton']);
}
else{
$kantone=$allekantone;//siehe Parametereinstellung auf Zeile 26
}


foreach($kantone AS $dieser_kanton){

lehrplanelement(strtolower($dieser_kanton),$_GET['uid'],$user_API,$password_API);

echo "<br><b>Laufzeit: ".$dieser_kanton." ".sprintf('%.3f',microtime(true) - $start)." Sekunden ausgelesen (".$z." Lehrplanelemente)!</b>";
}
?>