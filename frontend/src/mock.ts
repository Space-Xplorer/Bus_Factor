// API Contract Mock - frontend/src/mock.ts
// Verbatim JSON shapes and logic conforming to §5 and §6 of the BusFactor Spec.

export interface GraphNode {
  id: string;
  label: string;
  type: 'engineer' | 'service';
  criticality?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status?: 'RED' | 'YELLOW' | 'GREEN' | 'EXCLUDED';
  x?: number;
  y?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  kind: 'touched' | 'covers' | 'depends_on' | 'resolved';
}

export interface GraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface RiskBreakdown {
  exclusivity: number;
  centrality: number;
  doc_coverage: number;
}

export interface RiskPair {
  engineer: string;
  service: string;
  score: number;
  status: 'RED' | 'YELLOW' | 'GREEN' | 'EXCLUDED';
  breakdown: RiskBreakdown;
}

export interface RiskResponse {
  formula: string;
  pairs: RiskPair[];
}

export interface ResignZone {
  service: string;
  score: number;
  evidence: string[];
}

export interface InterviewQuestion {
  zone: string;
  text: string;
  index: number;
  total: number;
}

export interface ResignResponse {
  session_id: string;
  zones: ResignZone[];
  first_question: InterviewQuestion;
}

export type InterviewAnswerResponse = 
  | { done: false; next_question: InterviewQuestion }
  | { done: true; captured_zones: string[] };

export interface RiskDeltaItem {
  engineer: string;
  service: string;
  before: {
    score: number;
    status: 'RED' | 'YELLOW' | 'GREEN' | 'EXCLUDED';
  };
  after: {
    score: number;
    status: 'RED' | 'YELLOW' | 'GREEN' | 'EXCLUDED';
  };
}

export interface CaptureCompleteResponse {
  delta: RiskDeltaItem[];
  memory_events: string[];
}

// In-Memory Database state to simulate actual backend updates during UI interaction.
class MockDatabase {
  public nodes: GraphNode[] = [];
  public edges: GraphEdge[] = [];
  public riskPairs: RiskPair[] = [];
  public activeSession: {
    sessionId: string;
    engineer: string;
    zones: ResignZone[];
    questions: { zone: string; text: string }[];
    currentQuestionIndex: number;
    answers: { question: string; answer: string }[];
  } | null = null;

  constructor() {
    this.reset();
  }

  reset() {
    // Initial nodes per service registry and roster
    this.nodes = [
      // Engineers
      { id: 'Priya Nair', label: 'Priya Nair', type: 'engineer' },
      { id: 'Rohan Bhat', label: 'Rohan Bhat', type: 'engineer' },
      { id: 'Karan Shah', label: 'Karan Shah', type: 'engineer' },
      { id: 'Arjun Mehta', label: 'Arjun Mehta', type: 'engineer' },
      { id: 'Vikram Pillai', label: 'Vikram Pillai', type: 'engineer' },
      { id: 'Sara Iqbal', label: 'Sara Iqbal', type: 'engineer' },
      { id: 'Tanvi Desai', label: 'Tanvi Desai', type: 'engineer' },
      { id: 'Dev Kulkarni', label: 'Dev Kulkarni', type: 'engineer' },
      { id: 'Meera Joshi', label: 'Meera Joshi', type: 'engineer' },
      { id: 'Ananya Rao', label: 'Ananya Rao', type: 'engineer' },

      // Services
      { id: 'payments-api', label: 'payments-api', type: 'service', criticality: 'CRITICAL', status: 'GREEN' },
      { id: 'payment-retry-engine', label: 'payment-retry-engine', type: 'service', criticality: 'CRITICAL', status: 'RED' },
      { id: 'kafka-settlement-consumer', label: 'kafka-settlement-consumer', type: 'service', criticality: 'CRITICAL', status: 'RED' },
      { id: 'ledger-reconciliation-cron', label: 'ledger-reconciliation-cron', type: 'service', criticality: 'CRITICAL', status: 'RED' },
      { id: 'merchant-onboarding', label: 'merchant-onboarding', type: 'service', criticality: 'HIGH', status: 'GREEN' },
      { id: 'notifications-service', label: 'notifications-service', type: 'service', criticality: 'MEDIUM', status: 'YELLOW' },
      { id: 'analytics-pipeline', label: 'analytics-pipeline', type: 'service', criticality: 'HIGH', status: 'GREEN' },
      { id: 'merchant-dashboard', label: 'merchant-dashboard', type: 'service', criticality: 'HIGH', status: 'GREEN' },
      { id: 'design-system', label: 'design-system', type: 'service', criticality: 'LOW', status: 'GREEN' },
      { id: 'infra-terraform', label: 'infra-terraform', type: 'service', criticality: 'HIGH', status: 'GREEN' },
      { id: 'oncall-bot', label: 'oncall-bot', type: 'service', criticality: 'MEDIUM', status: 'GREEN' },
      { id: 'legacy-fx-service', label: 'legacy-fx-service', type: 'service', criticality: 'LOW', status: 'EXCLUDED' }
    ];

    // Edges linking engineers to services and services to each other
    this.edges = [
      // Primary ownership (touched)
      { source: 'Priya Nair', target: 'payment-retry-engine', kind: 'touched' },
      { source: 'Priya Nair', target: 'kafka-settlement-consumer', kind: 'touched' },
      { source: 'Priya Nair', target: 'ledger-reconciliation-cron', kind: 'touched' },
      { source: 'Priya Nair', target: 'payments-api', kind: 'touched' },
      { source: 'Arjun Mehta', target: 'payments-api', kind: 'touched' },
      { source: 'Vikram Pillai', target: 'payments-api', kind: 'touched' },
      { source: 'Arjun Mehta', target: 'merchant-onboarding', kind: 'touched' },
      { source: 'Vikram Pillai', target: 'merchant-onboarding', kind: 'touched' },
      { source: 'Karan Shah', target: 'notifications-service', kind: 'touched' },
      { source: 'Rohan Bhat', target: 'analytics-pipeline', kind: 'touched' },
      { source: 'Dev Kulkarni', target: 'merchant-dashboard', kind: 'touched' },
      { source: 'Meera Joshi', target: 'merchant-dashboard', kind: 'touched' },
      { source: 'Meera Joshi', target: 'design-system', kind: 'touched' },
      { source: 'Sara Iqbal', target: 'infra-terraform', kind: 'touched' },
      { source: 'Tanvi Desai', target: 'infra-terraform', kind: 'touched' },
      { source: 'Tanvi Desai', target: 'oncall-bot', kind: 'touched' },
      { source: 'Sara Iqbal', target: 'oncall-bot', kind: 'touched' },
      { source: 'Priya Nair', target: 'legacy-fx-service', kind: 'touched' }, // forgotten context

      // Service to Service dependencies (depends_on)
      { source: 'payments-api', target: 'payment-retry-engine', kind: 'depends_on' },
      { source: 'payments-api', target: 'kafka-settlement-consumer', kind: 'depends_on' },
      { source: 'kafka-settlement-consumer', target: 'ledger-reconciliation-cron', kind: 'depends_on' },
      { source: 'merchant-onboarding', target: 'payments-api', kind: 'depends_on' },
      { source: 'notifications-service', target: 'payments-api', kind: 'depends_on' },
      { source: 'analytics-pipeline', target: 'kafka-settlement-consumer', kind: 'depends_on' },
      { source: 'merchant-dashboard', target: 'payments-api', kind: 'depends_on' },
      { source: 'merchant-dashboard', target: 'analytics-pipeline', kind: 'depends_on' }
    ];

    // Initial Risk assessment pairs based on §4.2 and MANIFEST
    this.riskPairs = [
      {
        engineer: 'Priya Nair',
        service: 'payment-retry-engine',
        score: 0.72,
        status: 'RED',
        breakdown: { exclusivity: 0.9, centrality: 0.8, doc_coverage: 0.0 }
      },
      {
        engineer: 'Priya Nair',
        service: 'kafka-settlement-consumer',
        score: 0.64,
        status: 'RED',
        breakdown: { exclusivity: 0.8, centrality: 0.8, doc_coverage: 0.0 }
      },
      {
        engineer: 'Priya Nair',
        service: 'ledger-reconciliation-cron',
        score: 0.56,
        status: 'RED',
        breakdown: { exclusivity: 0.7, centrality: 0.8, doc_coverage: 0.0 }
      },
      {
        engineer: 'Karan Shah',
        service: 'notifications-service',
        score: 0.28,
        status: 'YELLOW',
        breakdown: { exclusivity: 0.7, centrality: 0.4, doc_coverage: 0.0 }
      },
      {
        engineer: 'Priya Nair',
        service: 'payments-api',
        score: 0.15,
        status: 'GREEN',
        breakdown: { exclusivity: 0.3, centrality: 1.0, doc_coverage: 0.5 }
      },
      {
        engineer: 'Rohan Bhat',
        service: 'analytics-pipeline',
        score: 0.00,
        status: 'GREEN',
        breakdown: { exclusivity: 1.0, centrality: 0.6, doc_coverage: 1.0 } // Decoy case
      },
      {
        engineer: 'Arjun Mehta',
        service: 'payments-api',
        score: 0.10,
        status: 'GREEN',
        breakdown: { exclusivity: 0.2, centrality: 1.0, doc_coverage: 0.5 }
      },
      {
        engineer: 'Vikram Pillai',
        service: 'merchant-onboarding',
        score: 0.08,
        status: 'GREEN',
        breakdown: { exclusivity: 0.3, centrality: 0.5, doc_coverage: 0.5 }
      },
      {
        engineer: 'Dev Kulkarni',
        service: 'merchant-dashboard',
        score: 0.06,
        status: 'GREEN',
        breakdown: { exclusivity: 0.2, centrality: 0.6, doc_coverage: 0.5 }
      },
      {
        engineer: 'Sara Iqbal',
        service: 'infra-terraform',
        score: 0.09,
        status: 'GREEN',
        breakdown: { exclusivity: 0.3, centrality: 0.6, doc_coverage: 0.5 }
      }
    ];

    this.activeSession = null;
  }

  getGraph(): GraphResponse {
    return {
      nodes: JSON.parse(JSON.stringify(this.nodes)),
      edges: JSON.parse(JSON.stringify(this.edges))
    };
  }

  getRisk(): RiskResponse {
    return {
      formula: 'exclusivity * centrality * (1 - doc_coverage)',
      pairs: JSON.parse(JSON.stringify(this.riskPairs))
    };
  }

  resign(engineer: string): ResignResponse {
    if (engineer !== 'Priya Nair') {
      // General mock response for other engineers (no major red zones)
      this.activeSession = {
        sessionId: 'mock-sess-' + Date.now(),
        engineer,
        zones: [],
        questions: [],
        currentQuestionIndex: 0,
        answers: []
      };
      return {
        session_id: this.activeSession.sessionId,
        zones: [],
        first_question: {
          zone: 'None',
          text: 'No critical red zones identified. Resignation is safe. Press complete to finalize.',
          index: 1,
          total: 1
        }
      };
    }

    // Set up Priya Nair's 3 Red Zones as defined in MANIFEST Story 1
    const zones: ResignZone[] = [
      {
        service: 'payment-retry-engine',
        score: 0.72,
        evidence: [
          'Slack Thread #1: Priya details the DLQ drain procedure',
          'Slack Thread #7: Priya states the secret salt rotation invariant',
          'ADR-007: Note says "idempotency details live in Priyas head"'
        ]
      },
      {
        service: 'kafka-settlement-consumer',
        score: 0.64,
        evidence: [
          'Slack Thread #2: Detail on 12-partition pin and k8s HPA limits'
        ]
      },
      {
        service: 'ledger-reconciliation-cron',
        score: 0.56,
        evidence: [
          'Slack Thread #3: Lock file location & HDFC late file SFTP recovery instructions',
          'Postmortem PM-2026-01: Reversal script executed by Priya'
        ]
      }
    ];

    const questions = [
      {
        zone: 'payment-retry-engine',
        text: 'PM-2025-08 mentions the DLQ drain-and-replay procedure. What is the maximum batch size for replay, and what verification check must be enabled?'
      },
      {
        zone: 'kafka-settlement-consumer',
        text: 'Slack thread T2 details partition-pinning for bank order. How many partitions are pinned, and what is the HPA max cap set to?'
      },
      {
        zone: 'ledger-reconciliation-cron',
        text: 'For the nightly ledger cron, where is the lock file located, and where does the custom settlement reversal script live?'
      }
    ];

    this.activeSession = {
      sessionId: 'sess-priya-' + Date.now(),
      engineer: 'Priya Nair',
      zones,
      questions,
      currentQuestionIndex: 0,
      answers: []
    };

    return {
      session_id: this.activeSession.sessionId,
      zones,
      first_question: {
        zone: questions[0].zone,
        text: questions[0].text,
        index: 1,
        total: questions.length
      }
    };
  }

  answer(sessionId: string, text: string): InterviewAnswerResponse {
    const s = this.activeSession;
    if (!s || s.sessionId !== sessionId) {
      throw new Error('Invalid session ID');
    }

    if (s.questions.length === 0) {
      return {
        done: true,
        captured_zones: s.zones.map(z => z.service)
      };
    }

    s.answers.push({
      question: s.questions[s.currentQuestionIndex].text,
      answer: text
    });

    s.currentQuestionIndex++;

    if (s.currentQuestionIndex >= s.questions.length) {
      return {
        done: true,
        captured_zones: s.zones.map(z => z.service)
      };
    } else {
      const q = s.questions[s.currentQuestionIndex];
      return {
        done: false,
        next_question: {
          zone: q.zone,
          text: q.text,
          index: s.currentQuestionIndex + 1,
          total: s.questions.length
        }
      };
    }
  }

  complete(sessionId: string): CaptureCompleteResponse {
    const s = this.activeSession;
    if (!s || s.sessionId !== sessionId) {
      throw new Error('Invalid session ID');
    }

    // Healed delta calculation:
    // Capturing knowledge raises doc_coverage to 0.5, decreasing the risk score
    const delta: RiskDeltaItem[] = [];

    if (s.engineer === 'Priya Nair') {
      const healedServices = ['payment-retry-engine', 'kafka-settlement-consumer', 'ledger-reconciliation-cron'];
      
      // Update in-memory DB: change node statuses and update risk pairs
      this.riskPairs = this.riskPairs.map(p => {
        if (p.engineer === 'Priya Nair' && healedServices.includes(p.service)) {
          const beforeScore = p.score;
          const beforeStatus = p.status;
          
          // Recompute with doc_coverage = 0.5
          const newDocCoverage = 0.5;
          const newScore = Number((p.breakdown.exclusivity * p.breakdown.centrality * (1 - newDocCoverage)).toFixed(2));
          
          // Buckets: RED >= 0.45, YELLOW 0.20-0.45, GREEN < 0.20
          let newStatus: 'RED' | 'YELLOW' | 'GREEN' | 'EXCLUDED' = 'GREEN';
          if (newScore >= 0.45) newStatus = 'RED';
          else if (newScore >= 0.20) newStatus = 'YELLOW';

          p.score = newScore;
          p.status = newStatus;
          p.breakdown.doc_coverage = newDocCoverage;

          // Update main nodes list as well
          const serviceNode = this.nodes.find(n => n.id === p.service);
          if (serviceNode) {
            serviceNode.status = newStatus;
          }

          delta.push({
            engineer: 'Priya Nair',
            service: p.service,
            before: { score: beforeScore, status: beforeStatus },
            after: { score: newScore, status: newStatus }
          });
        }
        return p;
      });

      // Clear Priya Nair's active red statuses on her engineer node or others if needed
      // Priya Nair's exclusive edges remain, but the risk is mitigated.
    }

    // Reset session
    this.activeSession = null;

    return {
      delta,
      memory_events: [
        'cognify: 3 document fragments added to memory dataset (slack_captures)',
        `cognify: parsed and linked knowledge context to services: ${s.zones.map(z => z.service).join(', ')}`,
        'cognee: running ontology recompute...',
        'cognee: database re-indexing complete.',
        `recompute: risk engine successfully recomputed scores. 3 red zones healed to YELLOW.`
      ]
    };
  }
}

export const db = new MockDatabase();

// Mock API clients wrapping database calls to simulate async HTTP requests
export const api = {
  getGraph: async (): Promise<GraphResponse> => {
    return new Promise(resolve => setTimeout(() => resolve(db.getGraph()), 300));
  },
  getRisk: async (): Promise<RiskResponse> => {
    return new Promise(resolve => setTimeout(() => resolve(db.getRisk()), 300));
  },
  resign: async (engineer: string): Promise<ResignResponse> => {
    return new Promise(resolve => setTimeout(() => resolve(db.resign(engineer)), 400));
  },
  answer: async (sessionId: string, text: string): Promise<InterviewAnswerResponse> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          resolve(db.answer(sessionId, text));
        } catch (e) {
          reject(e);
        }
      }, 400);
    });
  },
  completeCapture: async (sessionId: string): Promise<CaptureCompleteResponse> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          resolve(db.complete(sessionId));
        } catch (e) {
          reject(e);
        }
      }, 500);
    });
  },
  reset: () => {
    db.reset();
  }
};
