# routers/departments.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.department import Department
from app.models.mention import Mention
from app.schemas.department import DepartmentCreate, DepartmentResponse, DepartmentUpdate
from app.schemas.mention import MentionResponse

router = APIRouter(prefix="/departments", tags=["Departments"])


@router.post("/", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
def create_department(payload: DepartmentCreate, db: Session = Depends(get_db)):
    if db.query(Department).filter(Department.name == payload.name).first():
        raise HTTPException(status_code=409, detail="Department name already exists.")
    dept = Department(**payload.model_dump())
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept


@router.get("/", response_model=list[DepartmentResponse])
def list_departments(db: Session = Depends(get_db)):
    return db.query(Department).order_by(Department.name).all()


@router.get("/{dept_id}", response_model=DepartmentResponse)
def get_department(dept_id: int, db: Session = Depends(get_db)):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found.")
    return dept


@router.patch("/{dept_id}", response_model=DepartmentResponse)
def update_department(dept_id: int, payload: DepartmentUpdate, db: Session = Depends(get_db)):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found.")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(dept, field, value)
    db.commit()
    db.refresh(dept)
    return dept


@router.delete("/{dept_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_department(dept_id: int, db: Session = Depends(get_db)):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found.")
    db.delete(dept)
    db.commit()


@router.get("/{dept_id}/mentions", response_model=list[MentionResponse])
def list_department_mentions(
    dept_id: int,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    """All mentions currently routed to this department."""
    if not db.query(Department).filter(Department.id == dept_id).first():
        raise HTTPException(status_code=404, detail="Department not found.")
    return (
        db.query(Mention)
        .filter(Mention.department_id == dept_id)
        .order_by(Mention.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
