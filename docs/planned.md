# Modules


## Course


> Admins Only

Set the current c


**Uses**: Nothing

> Admins Only

`/course bind [deparment] [number] [roles]`

Binds a course to the current channel based on the role(s). 
Will auto update permissions based on this role (for visabilitiy)

> Admins Only

` /course unbind`

Removes all roles binded roles from a channel that were binded.

> Admins Only

` /course lock`

Locks the channel from users with the binded roles

> Admins Only

` /course unlock`

Unlocks the channel from users with the binded roles


> Admins Only

` /course hide`

Hides the channel from users with the binded roles. This will also hide the course on the Course Listing.

> Admins Only

` /course unhide`


Unhides the channel from users with the binded roles. This will also re-add the course to the Course Listing.



## Exam Notification
**Uses**: Course

> Everyone

`/exam add [date] [time]`

Adds an exam to the current channel. A course binded to a role is required.

## SVSU Calender
**Uses**: Course

> Admin Only

`/calendar bind`

Binds the SVSU calender to the current channel.
The calendar will provide "IMPORTANT DATES", as well as the monthly dates for users from the SVSU Calendar.
The important date notification will occur as follows:
- Payments/Registar will be warned 7 days in advanced. Also on the day its due.
    - The 7 days in advanced for closing only, not starting
- Semester starting/ending will be notified on the day of occurance.

The "IMPORTANT DATES" including, payments, semester ends/start will be in a top header. 
All other dates will be below. All notifications will occur below those.


## SVSU Course Requirments
**Uses**: Calendar, Course
`/requiements`
This will allow for the course to be searched based on the Course. 

> Events
Also when the current semester is about to start, 7 days prior all course will have a course list message in the channel.
No notification will occur, but it will be the "course semester start sequence"


