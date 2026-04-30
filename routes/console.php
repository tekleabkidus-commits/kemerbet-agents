<?php

use Illuminate\Support\Facades\Schedule;

Schedule::command('agents:check-reminders')->everyMinute();
Schedule::command('agents:wakeup')->dailyAt('07:00')->timezone('Africa/Addis_Ababa');
