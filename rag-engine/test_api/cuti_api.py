"""
Test API for 'Cuti' (Leave) Context
Simple mock API that simulates employee leave balance queries.

Run: python cuti_api.py
Port: 8090
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from datetime import date

app = FastAPI(
    title="Bitcoder Test API - Cuti",
    description="Mock API untuk testing konteks cuti (leave management)",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MOCK_EMPLOYEES = {
    "EMP001": {
        "name": "Ahmad Rizki",
        "department": "Engineering",
        "join_date": "2022-03-15",
        "leave_balance": {
            "annual": 12,
            "used_annual": 3,
            "sick": 10,
            "used_sick": 1,
            "personal": 3,
            "used_personal": 0,
        },
        "leave_history": [
            {"date": "2025-01-02", "type": "Annual", "days": 2, "reason": "Year end break"},
            {"date": "2025-02-14", "type": "Personal", "days": 1, "reason": "Family event"},
        ],
    },
    "EMP002": {
        "name": "Siti Nurhaliza",
        "department": "Marketing",
        "join_date": "2021-06-01",
        "leave_balance": {
            "annual": 14,
            "used_annual": 8,
            "sick": 10,
            "used_sick": 3,
            "personal": 3,
            "used_personal": 2,
        },
        "leave_history": [
            {"date": "2025-01-10", "type": "Sick", "days": 2, "reason": "Flu"},
            {"date": "2025-02-20", "type": "Annual", "days": 5, "reason": "Vacation"},
        ],
    },
    "EMP003": {
        "name": "Budi Santoso",
        "department": "Finance",
        "join_date": "2020-01-10",
        "leave_balance": {
            "annual": 16,
            "used_annual": 12,
            "sick": 10,
            "used_sick": 0,
            "personal": 3,
            "used_personal": 1,
        },
        "leave_history": [
            {"date": "2025-01-05", "type": "Annual", "days": 7, "reason": "Family vacation"},
            {"date": "2025-03-01", "type": "Personal", "days": 1, "reason": "Personal matters"},
        ],
    },
}


class LeaveBalanceRequest(BaseModel):
    emp_id: str


class LeaveSubmitRequest(BaseModel):
    emp_id: str
    leave_type: str
    start_date: str
    end_date: str
    reason: str


@app.get("/")
async def root():
    return {
        "service": "Bitcoder Test API - Cuti",
        "version": "1.0.0",
        "endpoints": {
            "GET /api/leave/balance?emp_id=EMP001": "Get leave balance",
            "POST /api/leave/balance": "Get leave balance (POST)",
            "POST /api/leave/submit": "Submit leave request (mock)",
            "GET /api/leave/history?emp_id=EMP001": "Get leave history",
            "GET /api/employees": "List all mock employees",
        },
    }


@app.get("/api/leave/balance")
async def get_leave_balance_get(emp_id: str):
    return await _get_balance(emp_id)


@app.post("/api/leave/balance")
async def get_leave_balance_post(request: LeaveBalanceRequest):
    return await _get_balance(request.emp_id)


async def _get_balance(emp_id: str):
    if emp_id not in MOCK_EMPLOYEES:
        raise HTTPException(status_code=404, detail=f"Employee {emp_id} not found")

    emp = MOCK_EMPLOYEES[emp_id]
    balance = emp["leave_balance"]

    return {
        "emp_id": emp_id,
        "name": emp["name"],
        "department": emp["department"],
        "balance": {
            "annual_leave": {
                "total": balance["annual"],
                "used": balance["used_annual"],
                "remaining": balance["annual"] - balance["used_annual"],
            },
            "sick_leave": {
                "total": balance["sick"],
                "used": balance["used_sick"],
                "remaining": balance["sick"] - balance["used_sick"],
            },
            "personal_leave": {
                "total": balance["personal"],
                "used": balance["used_personal"],
                "remaining": balance["personal"] - balance["used_personal"],
            },
        },
        "total_remaining": (
            (balance["annual"] - balance["used_annual"])
            + (balance["sick"] - balance["used_sick"])
            + (balance["personal"] - balance["used_personal"])
        ),
    }


@app.post("/api/leave/submit")
async def submit_leave(request: LeaveSubmitRequest):
    if request.emp_id not in MOCK_EMPLOYEES:
        raise HTTPException(status_code=404, detail=f"Employee {request.emp_id} not found")

    return {
        "status": "submitted",
        "message": f"Leave request submitted for {MOCK_EMPLOYEES[request.emp_id]['name']}",
        "details": {
            "emp_id": request.emp_id,
            "leave_type": request.leave_type,
            "start_date": request.start_date,
            "end_date": request.end_date,
            "reason": request.reason,
        },
        "approval_status": "pending",
    }


@app.get("/api/leave/history")
async def get_leave_history(emp_id: str):
    if emp_id not in MOCK_EMPLOYEES:
        raise HTTPException(status_code=404, detail=f"Employee {emp_id} not found")

    emp = MOCK_EMPLOYEES[emp_id]
    return {
        "emp_id": emp_id,
        "name": emp["name"],
        "history": emp["leave_history"],
    }


@app.get("/api/employees")
async def list_employees():
    return {
        "employees": [
            {"emp_id": eid, "name": emp["name"], "department": emp["department"]}
            for eid, emp in MOCK_EMPLOYEES.items()
        ]
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8090)
