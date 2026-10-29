import { CourseSpec } from '../types';

export const initialCourseData: CourseSpec = {
  code: 'CS302',
  title: 'Operating Systems & Systems Programming',
  department: 'Department of Computer Science & Engineering',
  academicYear: '2024–2025 (Odd Semester)',
  regulation: 'R-2024 (Tier-1 Autonomous)',
  category: 'Professional Core (PCC) / Integrated (T+P)',
  lectureHours: 3,
  tutorialHours: 0,
  practicalHours: 2,
  credits: 4.0,
  theoryCredits: 3.0,
  labCredits: 1.0,
  overviewRationale:
    'CS302 provides foundational rigor in the architecture, abstractions, and implementation primitives of modern multi-user, multi-threaded operating systems. Emphasizing both POSIX kernel interface semantics and hardware-software interaction, the syllabus examines CPU scheduling paradigms, synchronization primitives (mutexes, semaphores, monitors), memory management hierarchies including demand paging and TLB translation, storage subsystem virtualization, and distributed file structures.',
  labPedagogy:
    'Through concurrent laboratory sessions, students synthesize real-time thread dispatchers, trace virtual address mappings, and implement custom virtual file system handlers using the C standard system calls library under Linux kernel v6.x.',
  modules: [
    {
      id: 1,
      title: 'Operating System Structure & Process Abstraction',
      theoryHours: 9,
      labHours: 6,
      topics:
        'Monolithic vs microkernel OS designs; Trap handling; Dual-mode CPU architecture; Process control blocks (PCB); Context switching mechanics; Fork-exec UNIX API; Linux CFS scheduler basics.',
      mandatoryLab:
        'Exp 1: Process hierarchy inspection via `procfs`; Exp 2: Custom CPU-bound fork/exec benchmarking wrapper.',
    },
    {
      id: 2,
      title: 'Concurrency, Synchronization & Deadlocks',
      theoryHours: 9,
      labHours: 6,
      topics:
        'Race conditions; Peterson’s algorithm; Hardware test-and-set instructions; Semaphores; Condition variables; Readers-Writers & Dining Philosophers; Banker’s safety algorithm.',
      mandatoryLab:
        'Exp 3: Multi-threaded Producer-Consumer bounded queue using pthread condition variables.',
    },
    {
      id: 3,
      title: 'Physical & Virtual Memory Architecture',
      theoryHours: 9,
      labHours: 6,
      topics:
        'Contiguous allocation & fragmentation; Segmentation; Hierarchical & inverted page tables; Translation Lookaside Buffers (TLB); Page replacement (LRU, FIFO, Clock); Thrashing & working-set model.',
      mandatoryLab:
        'Exp 4: Emulation of multi-level page table walking with LRU page fault count simulator in C.',
    },
    {
      id: 4,
      title: 'Mass Storage & Virtual File Systems (VFS)',
      theoryHours: 9,
      labHours: 6,
      topics:
        'Magnetic & SSD storage geometry; Disk arm scheduling (SCAN, C-LOOK); File descriptor tables; Inodes; Ext4 vs ZFS journaling; VFS abstraction layers; NFS remote procedures.',
      mandatoryLab:
        'Exp 5: Userspace disk image traversal and raw Inode metadata extractor utility.',
    },
    {
      id: 5,
      title: 'Protection, Security & Virtualization',
      theoryHours: 9,
      labHours: 6,
      topics:
        'Access control matrices; Role-based access control (RBAC); Type 1 & Type 2 hypervisors; Linux namespaces & cgroups containerization; POSIX capabilities & seccomp filters.',
      mandatoryLab:
        'Exp 6: Building a lightweight isolated container environment using clone(2), unshare(2), and cgroups v2.',
    },
  ],
  courseOutcomes: [
    {
      id: 'CO1',
      statement:
        'Explain operating system kernel architectures, dual-mode hardware enforcement, and interrupt-driven context dispatching.',
      bloomLevel: 'L2: Understand',
      targetPOs: ['PO1', 'PO2'],
    },
    {
      id: 'CO2',
      statement:
        'Construct and execute multi-process concurrent systems using POSIX threads, IPC pipes, and mutex synchronizers.',
      bloomLevel: 'L3: Apply',
      targetPOs: ['PO1', 'PO3', 'PSO1'],
    },
    {
      id: 'CO3',
      statement:
        'Analyze CPU dispatching algorithms and race hazard conditions to construct deadlock prevention and detection graphs.',
      bloomLevel: 'L4: Analyze',
      targetPOs: ['PO2', 'PO4'],
    },
    {
      id: 'CO4',
      statement:
        'Evaluate virtual memory paging strategies, page fault servicing delays, and working-set frame allocation schemes.',
      bloomLevel: 'L5: Evaluate',
      targetPOs: ['PO3', 'PO5', 'PSO2'],
    },
    {
      id: 'CO5',
      statement:
        'Appraise storage allocation mechanisms, journaling inode file structures, and I/O bus throughput benchmarks.',
      bloomLevel: 'L5: Evaluate',
      targetPOs: ['PO4', 'PO5'],
    },
    {
      id: 'CO6',
      statement:
        'Formulate defensible security policies addressing privilege escalation, access control lists, and hardware-enforced protection domains.',
      bloomLevel: 'L4: Analyze',
      targetPOs: ['PO6', 'PO8', 'PSO3'],
    },
  ],
  assessmentItems: [
    {
      id: 'cie_midterms',
      name: 'Continuous Internal Evaluation (Theory Mid-Terms 1 & 2)',
      mode: 'Written Proctored Exam',
      marks: 50,
      weight: 30.0,
      complianceRule: 'Average of best 2 tests',
    },
    {
      id: 'cie_lab',
      name: 'Continuous Laboratory Assessment (Rubric-driven lab performance)',
      mode: 'Weekly Viva + Code Execution',
      marks: 30,
      weight: 20.0,
      complianceRule: 'Continuous Lab Portfolio',
    },
    {
      id: 'cie_project',
      name: 'Experiential Term Project (Micro-OS Kernel subsystem build)',
      mode: 'Peer Review & Git Repository',
      marks: 20,
      weight: 10.0,
      complianceRule: 'Rubric Tier-A (Industry Standard)',
    },
    {
      id: 'see_exam',
      name: 'Semester End Examination (SEE - Comprehensive Theory & Lab Practical)',
      mode: 'Central University Board Exam',
      marks: 100,
      weight: 40.0,
      complianceRule: 'External Examiner Moderated',
    },
  ],
  textbooks: [
    {
      id: 'tb1',
      authors: 'Silberschatz, A., Galvin, P. B., & Gagne, G.',
      year: 2018,
      title: 'Operating System Concepts',
      edition: '10th International Student Ed.',
      publisher: 'John Wiley & Sons',
      isbn: '978-1-119-45633-9',
    },
    {
      id: 'tb2',
      authors: 'Arpaci-Dusseau, R. H., & Arpaci-Dusseau, A. C.',
      year: 2018,
      title: 'Operating Systems: Three Easy Pieces',
      edition: 'v1.00',
      publisher: 'Arpaci-Dusseau Books',
      notes: 'Virtualization, Concurrency, Persistence',
    },
    {
      id: 'tb3',
      authors: 'Love, R.',
      year: 2010,
      title: 'Linux Kernel Development',
      edition: '3rd Ed.',
      publisher: 'Addison-Wesley Professional',
      isbn: '978-0-672-32946-3',
    },
    {
      id: 'tb4',
      authors: 'IEEE & The Open Group',
      year: 2018,
      title: 'Standard for Information Technology—Portable Operating System Interface (POSIX®) Base Specifications',
      edition: 'Issue 7 (IEEE Std 1003.1-2017)',
      publisher: 'IEEE Standards Association',
    },
  ],
  matrix: {
    CO1: { PO1: 3, PO2: 2, PO3: null, PO4: null, PO5: 1, PO6: null, PO7: null, PO8: null, PO9: null, PO10: 1, PO11: null, PSO1: 3, PSO2: 1, PSO3: null },
    CO2: { PO1: 3, PO2: 3, PO3: 3, PO4: 2, PO5: 2, PO6: null, PO7: null, PO8: null, PO9: 2, PO10: null, PO11: 1, PSO1: 3, PSO2: 3, PSO3: 1 },
    CO3: { PO1: 2, PO2: 3, PO3: 3, PO4: 3, PO5: 2, PO6: null, PO7: null, PO8: null, PO9: 1, PO10: null, PO11: null, PSO1: 3, PSO2: 2, PSO3: null },
    CO4: { PO1: 2, PO2: 2, PO3: 3, PO4: 2, PO5: 3, PO6: null, PO7: null, PO8: null, PO9: null, PO10: null, PO11: null, PSO1: 2, PSO2: 3, PSO3: 1 },
    CO5: { PO1: 2, PO2: 2, PO3: 2, PO4: 3, PO5: 3, PO6: 1, PO7: null, PO8: null, PO9: null, PO10: 1, PO11: null, PSO1: 2, PSO2: 3, PSO3: 2 },
    CO6: { PO1: 1, PO2: 1, PO3: null, PO4: 1, PO5: 1, PO6: 3, PO7: 1, PO8: 3, PO9: null, PO10: null, PO11: null, PSO1: 1, PSO2: 2, PSO3: 3 },
  },
  signatories: {
    author: {
      name: 'Prof. S. Jenkins',
      roleTitle: 'Course Coordinator / Author',
      designation: 'Associate Professor, CSE',
      signedDate: '22-Oct-2024',
      signatureDigest: 'AUTH-SHA256:d83f019a',
      isSigned: true,
    },
    reviewer: {
      name: 'Dr. M. Vance',
      roleTitle: 'Lead Curriculum Reviewer',
      designation: 'Professor & Dean Academic Programs',
      signedDate: '23-Oct-2024',
      signatureDigest: 'REV-SHA256:4b91ce02',
      isSigned: true,
    },
    hod: {
      name: 'Dr. A. Sharma',
      roleTitle: 'Head of Department (CSE)',
      designation: 'Professor & HOD, Computer Science & Engineering',
      signedDate: '24-Oct-2024',
      signatureDigest: 'HOD-SHA256:7f89c0b1',
      isSigned: true,
    },
  },
  bosResolution: 'CSE-2024/CURR-88',
  documentFingerprint: '7f89c0b1e459a8c20491dd629fae33b0',
  workflowStage: 'approved_ready_for_export',
  workflowStatus: 'Approved',
  sectionComments: [
    {
      id: 'comm-init-1',
      section: 3,
      user: 'Dr. M. Vance',
      role: 'Reviewer',
      comment: 'Verified Revised Bloom Taxonomy verbs across CO1 to CO6; cognitive depth meets Tier-1 accreditation threshold.',
      timestamp: '2024-10-23T14:20:00.000Z',
    },
    {
      id: 'comm-init-2',
      section: 5,
      user: 'Dr. A. Sharma',
      role: 'HOD',
      comment: 'Continuous assessment breakdown of 30% CIE + 20% Lab + 10% Project + 40% SEE validated against BoS standards.',
      timestamp: '2024-10-24T11:05:00.000Z',
    },
  ],
  versionTag: 'FINAL SEAL • REV-2024.1d (BoS Approved)',
  auditTrail: [
    {
      id: 'log-1',
      timestamp: '15-Oct-2024 10:30 IST',
      actor: 'Prof. S. Jenkins',
      role: 'Author',
      action: 'Curriculum Ingestion & Drafting',
      details: 'Initial course syllabus parsed and drafted with 6 COs and AICTE 2:1 laboratory ratio.',
      hash: 'a12b4e5f',
    },
    {
      id: 'log-2',
      timestamp: '22-Oct-2024 14:15 IST',
      actor: 'Prof. S. Jenkins',
      role: 'Author',
      action: 'Author Submission & Sign-off',
      details: 'All 5 modules, textbooks, and CO-PO matrix verified and submitted for peer review.',
      hash: 'd83f019a',
    },
    {
      id: 'log-3',
      timestamp: '23-Oct-2024 17:00 IST',
      actor: 'Dr. M. Vance',
      role: 'Reviewer',
      action: 'Curriculum Review & Endorsement',
      details: 'Bloom taxonomy distribution verified. Recommended inclusion of containerization lab.',
      hash: '4b91ce02',
    },
    {
      id: 'log-4',
      timestamp: '24-Oct-2024 16:42 IST',
      actor: 'Dr. A. Sharma',
      role: 'HOD',
      action: 'Board of Studies Final Seal & Resolution CSE-2024/CURR-88',
      details: 'Formally sealed for accreditation archive. Ready for NBA e-SAR & NAAC SSR filing.',
      hash: '7f89c0b1',
    },
  ],
};
